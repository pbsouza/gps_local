# KMZ Viewer & Rotas no Mapa

Visualizador interativo de arquivos **KMZ** e **KML** integrado com o **Google Maps Platform**, filtros dinâmicos por categoria, cálculo de rotas em tempo real, mini-mapas e **exportação direta para PDF** com links clicáveis de navegação GPS.

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente (Opcional)
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_GOOGLE_MAPS
```
> *Nota: O projeto já possui chave de demonstração ativa configurada por padrão para visualização imediata.*

### 4. Rodar o servidor de desenvolvimento
```bash
npm run dev
```
Abra no navegador em [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy Automático no GitHub Pages

O projeto já inclui a automação configurada em `.github/workflows/deploy.yml` e o Vite com caminhos relativos (`base: './'`), pronto para publicação automática no GitHub Pages.

### Passo a passo para ativar:
1. No seu repositório no GitHub, vá em **Settings** (Configurações).
2. Na barra lateral esquerda, clique em **Pages**.
3. Em **Build and deployment > Source**, selecione **GitHub Actions**.
4. Faça um `git push` para a branch `main` (ou `master`).
5. O GitHub Actions iniciará o build e o deploy automaticamente!

### Chave de API no GitHub (Opcional mas recomendado):
Para usar sua própria chave no build do GitHub Pages:
1. No repositório, vá em **Settings > Secrets and variables > Actions**.
2. Clique em **New repository secret**.
3. Crie o segredo com o nome `VITE_GOOGLE_MAPS_API_KEY` e cole sua chave do Google Maps.

---

## 🛠️ Tecnologias Utilizadas

- **React 19 & TypeScript**
- **Vite 8** (com `base: './'` para caminhos relativos no GitHub Pages)
- **Tailwind CSS v4**
- **@vis.gl/react-google-maps** (Google Maps JavaScript API)
- **JSZip** (descompactação de arquivos KMZ e extração de imagens/ícones)
- **jsPDF & html2canvas** (geração e download de PDF direto no cliente)
- **QRCode** (geração de QR codes para leitura no celular)
- **Lucide React** (ícones de interface)

---

## ✨ Recursos

- 📂 **Suporte a KMZ e KML**: Leitura automática de marcadores, pastas, geometrias (pontos, linhas, polígonos) e ícones incorporados.
- 🎨 **Filtro por Categorias**: Cores dinâmicas para cada categoria e busca textual em tempo real.
- 🚗 **Cálculo de Rotas**: Rotas a partir da localização atual (GPS), de um ponto de partida escolhido ou entre marcadores do KMZ.
- 📄 **Exportação em PDF**:
  - Download direto do arquivo `.pdf`.
  - Mini-mapas ilustrativos para cada ponto selecionado.
  - Links interativos que abrem a rota no Google Maps a partir da sua localização.
  - QR Codes individuais para escaneamento no celular.
