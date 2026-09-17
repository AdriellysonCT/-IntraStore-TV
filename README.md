# 📺 IntraStore TV - Loja & Distribuidor para Android TV

IntraStore TV é um ecossistema completo de distribuição e gerenciamento de aplicativos voltado para **Android TV, Google TV e TV Boxes** (10-Foot Experience), com navegação espacial estrita por controle remoto (D-Pad), integração com armazenamento na nuvem **Cloudflare R2** (Zero Egress Fees) e painel web administrativo responsivo com seletor inteligente de mídias.

---

## 🚀 Funcionalidades Principais

- **10-Foot UI Experience (Full HD & 4K):** Interface desenvolvida sob medida para navegação a 3 metros de distância com controle remoto D-pad.
- **Navegação Espacial Zero Lag:** Motor D-pad em 60 FPS com retorno memorizado e anéis de foco Cyber Neon (#00E5FF).
- **Auto Update Nativo:** Detecção de atualizações da loja com download interno em background e acionamento automático do instalador do Android TV sem sair do app.
- **Armazenamento na Nuvem Cloudflare R2:** Hospedagem gratuita de APKs e imagens sem custos de transferência.
- **Painel Administrativo Web (`/admin`):** Dashboard com cadastro de aplicativos, uploads com barra de progresso real, busca e seleção de ícones/banners da web com 1 clique e gestão de versões.
- **Instalação Direta via Downloader:** Suporte nativo ao app Downloader (AFTVnews) com redirecionamento HTTP 301/302 direto.

---

## 🛠️ Como Rodar Localmente

1. Entre na pasta do backend:
   ```bash
   cd server
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse:
   - **Aplicativo da TV:** http://localhost:3000/tv
   - **Painel Administrativo:** http://localhost:3000/admin
   - **Download do APK Oficial:** http://localhost:3000/apk

---

## ☁️ Deploy no Render (Web Service)

- **Root Directory:** `.` *(deixe em branco)*
- **Build Command:** `cd server && npm install`
- **Start Command:** `cd server && node server.js`
