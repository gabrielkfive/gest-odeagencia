# Como editar o WorkFlowArk de QUALQUER lugar (MacBook, outro PC, etc.)

Gabriel, este guia é pra você. Sem firula técnica. 🙂

O código do seu software agora mora no **GitHub** (a "nuvem do código"):
👉 https://github.com/gabrielkfive/gest-odeagencia

Isso quer dizer que você **não depende mais do seu PC de mesa**. Em qualquer
computador, você baixa a versão mais nova, edita comigo, e devolve pra nuvem.

---

## ✅ Jeito MAIS FÁCIL (recomendado): pelo navegador, sem instalar nada

1. Abra o site **https://claude.ai/code** (entre com a MESMA conta que você usa aqui).
2. Conecte/escolha o repositório **gabrielkfive/gest-odeagencia**.
3. Fale comigo normalmente: *"quero melhorar a aba de cobranças"*.
4. Eu edito, você revisa, e a gente publica.

Funciona do MacBook, do celular, de qualquer lugar — é só ter internet e login.

---

## 💻 Jeito pelo TERMINAL do MacBook (se preferir trabalhar local)

Você só precisa fazer isso **UMA vez** em cada computador novo:

### 1. Instalar as 3 ferramentas base
- **Git** (já vem no Mac; se pedir, é só aceitar instalar as "ferramentas de linha de comando")
- **Node.js** → baixe em https://nodejs.org (versão LTS)
- **Claude Code** → no terminal: `npm install -g @anthropic-ai/claude-code`

### 2. Baixar o software (clonar)
No terminal, escolha uma pasta (ex: a Área de Trabalho) e rode:
```bash
git clone https://github.com/gabrielkfive/gest-odeagencia.git
cd gest-odeagencia
npm install
```

### 3. Criar o arquivo de senhas (.env)
- O arquivo `.env` (com as chaves do Supabase) **não vem junto** por segurança.
- Copie o modelo `.env.example` para `.env` e preencha os valores:
```bash
cp .env.example .env
```
- Os valores você pega no painel do Supabase (projeto `fxfnonozzekxnxddxsnh`),
  em **Settings → API** — ou é só me pedir aqui no chat que eu te ajudo.

### 4. Rodar / editar
```bash
claude        # abre o Claude Code (eu) na pasta do projeto
npm run dev   # roda o site local em http://localhost:5173 pra você ver
```

---

## 🔄 A REGRA DE OURO (pra nunca dar conflito)

O GitHub é a "fonte da verdade". Sempre que sentar pra trabalhar:

- **ANTES de começar** (puxar o mais novo da nuvem):
  ```bash
  git pull
  ```
- **DEPOIS de editar** (mandar pra nuvem):
  ```bash
  git add -A
  git commit -m "o que eu mudei"
  git push
  ```

Se você me pedir, **eu faço esses comandos pra você** — é só falar
*"sincroniza com o GitHub"* ou *"salva o que a gente fez"*.

---

## 🚀 Publicar pra equipe (deploy)

O site oficial da equipe é **https://workflowark.arkcontent.workers.dev**.
Pra publicar uma mudança lá:
```bash
npm run build
npx wrangler deploy
```
(De novo: é só me pedir *"publica pra equipe"* que eu cuido disso.)

---

## ❓ Esqueci um passo / deu erro
Não tem problema. Abra o Claude Code na pasta e me diga o que aconteceu.
Eu resolvo. Você nunca precisa decorar nada disso. 💪
