package com.intrastore.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast

class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        webView = WebView(this).apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isFocusable = true
            isFocusableInTouchMode = true
        }

        setContentView(webView)
        configureWebView()

        val prefs = getSharedPreferences("intrastore_prefs", Context.MODE_PRIVATE)
        // IP local da maquina (192.168.0.4) ou emulador (10.0.2.2) ou fallback para assets
        val defaultUrl = "http://192.168.0.4:3000/tv"
        val storeUrl = prefs.getString("server_url", defaultUrl) ?: defaultUrl

        webView.loadUrl(storeUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        webView.addJavascriptInterface(WebAppInterface(this, webView), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                webView.requestFocus()
            }

            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                // Se falhar a conexao de rede com o servidor, carrega a copia local embutida em assets
                if (failingUrl != "file:///android_asset/tv/index.html") {
                    Toast.makeText(this@MainActivity, "Servidor offline. Carregando versao offline embutida...", Toast.LENGTH_LONG).show()
                    webView.loadUrl("file:///android_asset/tv/index.html")
                }
            }
        }

        webView.webChromeClient = WebChromeClient()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_BACK -> {
                    webView.evaluateJavascript("if (window.remoteNav && window.remoteNav.onBackHandler) { window.remoteNav.onBackHandler(); } else { window.history.back(); }", null)
                    return true
                }
                KeyEvent.KEYCODE_MENU -> {
                    // Tecla Menu do controle remoto: permite alterar o IP do servidor
                    showChangeServerDialog()
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun showChangeServerDialog() {
        val prefs = getSharedPreferences("intrastore_prefs", Context.MODE_PRIVATE)
        val current = prefs.getString("server_url", "http://192.168.0.4:3000/tv")

        val input = EditText(this)
        input.setText(current)

        AlertDialog.Builder(this)
            .setTitle("Configurar Servidor IntraStore")
            .setMessage("Digite a URL do servidor ou IP da loja na sua rede local:")
            .setView(input)
            .setPositiveButton("Conectar") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    prefs.edit().putString("server_url", newUrl).apply()
                    webView.loadUrl(newUrl)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
}