# Publicar o WorkFlowArk na Apple Store (e Google Play)

## A boa notícia
O app já é um **PWA** (tem `manifest.json` e `sw.js`). Isso encurta MUITO o caminho pra
virar um app de loja — a gente "embrulha" o site num app nativo, sem reescrever tudo.

## O caminho recomendado: Capacitor (embrulhar o PWA)
Capacitor pega o app web e gera um projeto iOS (Xcode) e Android (Android Studio) que abrem
o WorkFlowArk em tela cheia, com ícone, splash e acesso a recursos do celular (notificações,
câmera, etc.).

### Passos (visão geral — eu faço a parte técnica)
1. Adicionar Capacitor ao projeto e apontar pro app publicado.
2. Gerar ícones e splash (uso o símbolo da ARK).
3. Configurar notificações push (pros agentes te avisarem no celular).
4. Build iOS no **Xcode** (precisa de um **Mac** — seu, ou um Mac na nuvem tipo MacinCloud).
5. Build Android (não precisa de Mac).

## O que SÓ você pode providenciar
- **Apple Developer Program:** US$ 99/ano (developer.apple.com). Sem isso não publica na App Store.
- **Acesso a um Mac** pra rodar o Xcode (pode ser alugado na nuvem por algumas horas).
- **Google Play Console:** US$ 25 (pagamento único), pra publicar no Android.
- Textos/prints da loja (eu monto, você aprova).

## Ordem que faz sentido
1. **Estabilizar a versão web** (estamos nisso agora). O app de loja é a MESMA coisa embrulhada,
   então toda melhoria web já vai junto.
2. **Android primeiro** (mais barato e rápido, não precisa de Mac) — bom pra testar a experiência.
3. **iOS depois**, quando você tiver a conta Apple + acesso ao Mac.

## Cuidado importante da Apple
A Apple às vezes rejeita app que é "só um site embrulhado". Pra passar, a gente garante
recursos nativos de verdade: **notificações push** (agentes te avisando), **login nativo**,
e talvez **widget**. Já temos base pra isso.

## Próximo passo concreto
Quando você falar "bora app", eu adiciono o Capacitor e gero o build Android pra você instalar
no seu celular e sentir. iOS entra quando a conta Apple estiver pronta.
