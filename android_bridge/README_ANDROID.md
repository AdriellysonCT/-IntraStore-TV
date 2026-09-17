# Módulo Android TV - IntraStore TV

Este diretório contém o projeto nativo do **IntraStore TV** configurado com todas as permissões e otimizações para Android TV / Google TV.

---

## 🚀 Permissões Configuradas:
1. `REQUEST_INSTALL_PACKAGES`: Permite que o app baixe e solicite a instalação de outros APKs sem sair da loja.
2. `QUERY_ALL_PACKAGES`: Permite ao app escanear todos os pacotes instalados para checar quais possuem atualizações disponíveis.
3. `MANAGE_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`: Permite gravar os APKs no armazenamento antes de instalá-los.
4. `android.software.leanback`: Ativa o suporte nativo ao launcher de Android TV.
5. `android.hardware.touchscreen` como false: Permite publicação e execução em televisores que operam exclusivamente com controle remoto D-pad.

---

## 🛠️ Como Gerar o APK Instalável no Android Studio:
1. Abra o **Android Studio**.
2. Selecione **File > New > New Project > No Activity**.
3. Copie os arquivos deste diretório:
   - `AndroidManifest.xml` para `app/src/main/AndroidManifest.xml`
   - `MainActivity.kt` e `WebAppInterface.kt` para `app/src/main/java/com/intrastore/tv/`
   - `file_paths.xml` para `app/src/main/res/xml/file_paths.xml`
4. No arquivo `MainActivity.kt`, altere a variável `storeUrl` para o IP da sua máquina ou servidor (ex: `http://192.168.1.100:3000/tv`).
5. Clique em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. Instale o APK gerado na sua Android TV via pendrive ou comando:
   ```bash
   adb install app-debug.apk
   ```
