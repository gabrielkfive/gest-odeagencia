# WhatsApp grátis (Evolution API) na Oracle Cloud — passo a passo

Objetivo: rodar o WhatsApp do sistema **de graça pra sempre**, com foto, grupos e cara de
WhatsApp Web. Gabriel faz os passos do "👤 VOCÊ"; o Claude faz o resto.

> Regra: vamos um passo de cada vez. Faça o passo, me avise, eu te dou o próximo.

---

## PASSO 1 — 👤 VOCÊ: criar a conta Oracle Cloud (Always Free)
1. Acesse **https://www.oracle.com/cloud/free/** e clique em **Start for free**.
2. Cadastre com seu e-mail. Vai pedir **cartão de crédito** só pra confirmar que você é gente —
   **não cobra nada** no plano Always Free (pode aparecer uma pré-autorização de ~US$1 que volta).
3. Na escolha de região, prefira **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)**.
4. Quando entrar no painel (Console da Oracle), me avise: **"conta Oracle criada"**.

## PASSO 2 — 👤 VOCÊ (com a minha mão): criar a máquina (VM) grátis
Eu te passo o passo a passo da tela. Resumo do que vamos fazer:
- Criar uma **Instance** (VM) com a imagem **Ubuntu 22.04**, formato **Ampere A1 (ARM) Always Free**.
- Guardar a **chave SSH** (a Oracle gera e baixa pra você).
- Liberar a porta **8080** (regra de firewall / Security List).
- Anotar o **IP público** da VM.

## PASSO 3 — 🤖 CLAUDE: instalar e subir a Evolution
Com o acesso à VM, eu rodo (ou te passo pra colar no terminal da Oracle):
- Instalo Docker + Docker Compose.
- Copio os arquivos de `deploy/evolution/` (compose + .env já preenchido com IP/chave/senha que eu gero).
- `docker compose up -d` → a Evolution sobe.

## PASSO 4 — 👤 VOCÊ: conectar o WhatsApp (QR Code, 10 segundos)
- Eu crio a "instância" e gero o **QR Code**.
- No celular: **WhatsApp → Aparelhos conectados → Conectar aparelho → escaneie**. Pronto, igual WhatsApp Web.

## PASSO 5 — 🤖 CLAUDE: religar no sistema
- Eu troco a "tomada" do Z-API pela Evolution no código (`zapi.server.ts` + webhook), faço build e deploy.
- O atendente de WhatsApp volta a funcionar — agora de graça, vendo foto e grupo.

---

### Arquivos já prontos (neste reppositório)
- `deploy/evolution/docker-compose.yml` — sobe Evolution + Postgres + Redis.
- `deploy/evolution/.env.example` — modelo de configuração (IP, chave, senha, webhook).

### Observação honesta
Evolution é não-oficial (mesma base do Z-API), então o risco de ban do número é o mesmo do Z-API —
a diferença é que aqui é **R$0**. Para risco zero, só a API oficial da Meta (mais limitada).
