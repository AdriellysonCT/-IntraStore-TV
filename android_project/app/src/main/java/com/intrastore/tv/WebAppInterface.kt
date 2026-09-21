package com.intrastore.tv

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class WebAppInterface(private val context: Context, private val webView: WebView) {

    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun getAppVersionCode(): Long {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pInfo.longVersionCode else @Suppress("DEPRECATION") pInfo.versionCode.toLong()
        } catch (e: Exception) {
            1L
        }
    }

    @JavascriptInterface
    fun getAppVersionName(): String {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            pInfo.versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    @JavascriptInterface
    fun getInstalledAppsJson(): String {
        val jsonArray = JSONArray()
        val pm: PackageManager = context.packageManager
        val packages = pm.getInstalledPackages(0)

        for (packageInfo in packages) {
            if (pm.getLaunchIntentForPackage(packageInfo.packageName) != null) {
                val appObj = JSONObject()
                appObj.put("packageName", packageInfo.packageName)
                appObj.put("versionName", packageInfo.versionName ?: "1.0.0")

                val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.versionCode.toLong()
                }

                appObj.put("versionCode", versionCode)
                jsonArray.put(appObj)
            }
        }
        return jsonArray.toString()
    }

    @JavascriptInterface
    fun isAppInstalled(packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    @JavascriptInterface
    fun openApp(packageName: String): Boolean {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        return if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
            true
        } else {
            Toast.makeText(context, "Não foi possível abrir o aplicativo.", Toast.LENGTH_SHORT).show()
            false
        }
    }

    /**
     * Download interno e direto de APK em segundo plano (sem navegador)
     * e disparo imediato do instalador nativo do sistema Android TV assim que concluir.
     */
    @JavascriptInterface
    fun installApk(downloadUrl: String, packageName: String) {
        Thread {
            try {
                postJs("if (window.onNativeDownloadStart) window.onNativeDownloadStart('$packageName');")

                val fileName = "app_${packageName}_${System.currentTimeMillis()}.apk"
                val destination = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName)
                if (destination.exists()) destination.delete()

                var currentUrl = downloadUrl.trim()
                if (!currentUrl.startsWith("http://", ignoreCase = true) && !currentUrl.startsWith("https://", ignoreCase = true)) {
                    val prefs = context.getSharedPreferences("intrastore_prefs", Context.MODE_PRIVATE)
                    val serverUrl = prefs.getString("server_url", "https://intrastore-tv.onrender.com/tv") ?: "https://intrastore-tv.onrender.com/tv"
                    val baseUrl = try {
                        val parsed = URL(serverUrl)
                        "${parsed.protocol}://${parsed.authority}"
                    } catch (e: Exception) {
                        "https://intrastore-tv.onrender.com"
                    }
                    val path = if (currentUrl.startsWith("/")) currentUrl else "/$currentUrl"
                    currentUrl = baseUrl + path
                }

                var connection: HttpURLConnection? = null
                var redirects = 0
                val maxRedirects = 5

                while (redirects < maxRedirects) {
                    val url = URL(currentUrl)
                    connection = url.openConnection() as HttpURLConnection
                    connection.instanceFollowRedirects = true
                    connection.connectTimeout = 15000
                    connection.readTimeout = 30000
                    connection.setRequestProperty("User-Agent", "IntraStoreTV/1.0 (Android TV)")
                    connection.connect()

                    val status = connection.responseCode
                    if (status == HttpURLConnection.HTTP_MOVED_PERM || status == HttpURLConnection.HTTP_MOVED_TEMP || status == 307 || status == 308) {
                        val newUrl = connection.getHeaderField("Location")
                        connection.disconnect()
                        if (newUrl != null) {
                            currentUrl = newUrl
                            redirects++
                            continue
                        }
                    }
                    break
                }

                if (connection == null || connection.responseCode !in 200..299) {
                    throw Exception("Servidor respondeu com código de erro: ${connection?.responseCode}")
                }

                val fileLength = connection.contentLength
                val input = connection.inputStream
                val output = FileOutputStream(destination)

                val buffer = ByteArray(8192)
                var total: Long = 0
                var count: Int
                var lastReportedPercent = -1

                while (input.read(buffer).also { count = it } != -1) {
                    total += count
                    output.write(buffer, 0, count)

                    if (fileLength > 0) {
                        val percent = ((total * 100) / fileLength).toInt()
                        if (percent != lastReportedPercent) {
                            lastReportedPercent = percent
                            postJs("if (window.onNativeDownloadProgress) window.onNativeDownloadProgress($percent);")
                        }
                    }
                }

                output.flush()
                output.close()
                input.close()
                connection.disconnect()

                // Download 100% concluído no disco! Notifica a interface web
                postJs("if (window.onNativeDownloadComplete) window.onNativeDownloadComplete('$packageName');")

                // Disparar instalador nativo do sistema Android TV na UI thread
                mainHandler.post {
                    triggerApkInstall(destination)
                }

            } catch (e: Exception) {
                e.printStackTrace()
                val safeMsg = (e.message ?: "Erro desconhecido").replace("'", "\\'")
                postJs("if (window.onNativeDownloadError) window.onNativeDownloadError('$safeMsg');")
                mainHandler.post {
                    Toast.makeText(context, "Erro no download: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }

    private fun triggerApkInstall(apkFile: File) {
        if (!apkFile.exists()) return

        // Verifica permissão para instalar fontes desconhecidas (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.packageManager.canRequestPackageInstalls()) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:" + context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    Toast.makeText(context, "Por favor, autorize a IntraStore TV para instalar aplicativos", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        try {
            val uri: Uri = FileProvider.getUriForFile(
                context,
                context.packageName + ".provider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }

            context.startActivity(installIntent)
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Erro ao abrir instalador nativo: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun postJs(script: String) {
        mainHandler.post {
            webView.evaluateJavascript(script, null)
        }
    }

    @JavascriptInterface
    fun exitApp() {
        if (context is Activity) {
            context.finishAffinity()
        }
    }
}
