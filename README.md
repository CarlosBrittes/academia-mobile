# 🏋️ Studio 6.4 — Acompanhamento de Alunos

Aplicativo desenvolvido com React Native, Javascript, firebase e Expo para apoiar os professores da academia Studio 6.4 no cadastro e acompanhamento de seus alunos.

## 📖 Sobre o Projeto

Este projeto foi desenvolvido como atividade acadêmica voltada ao desenvolvimento de aplicativos móveis, com o objetivo de aplicar conceitos de interface, autenticação, persistência de dados e testes automatizados em um contexto real de atendimento.

A proposta consiste em centralizar as informações dos alunos da academia **Studio 6.4**, reunindo cadastro, treinos, avaliações de bioimpedância e orientações nutricionais em um único aplicativo.

## 🎯 Funcionalidades

- **Autenticação:** acesso por e-mail e senha com Firebase Authentication.
- **Cadastro de alunos:** registro dos dados pessoais e de contato, com seleção de foto pela galeria.
- **Lista de alunos:** consulta e busca dos cadastros.
- **Treinos:** organização das informações de treinamento e acompanhamento das atualizações no perfil do aluno.
- **Bioimpedância:** registro de avaliações para acompanhar a evolução corporal.
- **Nutrição:** organização das orientações e do plano alimentar.
- **Histórico:** preservação das atualizações e da identificação de quem realizou o registro.
- **WhatsApp:** abertura de uma mensagem de atualização para o telefone cadastrado.


## 🛠️ Ferramentas Utilizadas

- **React Native:** construção da interface do aplicativo.
- **Expo — SDK 54:** ambiente de desenvolvimento e execução.
- **JavaScript:** implementação das funcionalidades.
- **Firebase Authentication:** autenticação por e-mail e senha.
- **Cloud Firestore:** persistência dos dados no servidor.
- **Node.js e npm:** instalação das dependências e execução dos comandos.
- **Visual Studio Code:** edição e organização do código.
- **Git:** controle de versão.

## 📋 Pré-requisitos

- Node.js **22 ou 24 LTS**, com npm disponível.
- Código do projeto e seus arquivos `package.json` e `package-lock.json`.
- Dependências instaladas por `npm.cmd ci`.
- Configuração do Firebase utilizada pelo projeto, com Authentication e Firestore disponíveis.
- Conexão com a internet para acessar os serviços do Firebase e utilizar o WhatsApp.
- Para testar no celular: **Expo Go compatível com o SDK 54**.

> Execute todos os comandos dentro da pasta `academia-mobile`, onde está o arquivo `package.json`. No Windows, os comandos com `.cmd` evitam o bloqueio dos scripts `npm.ps1` e `npx.ps1` pelo PowerShell.

---

## ▶️ Executar

### No computador — navegador

1. Abra a pasta `academia-mobile` no Visual Studio Code.
2. Acesse **Terminal → Novo Terminal**.
3. Confirme que o terminal está dentro de `academia-mobile`.
4. Instale as dependências e inicie a versão web:

```powershell
npm.cmd ci
npx.cmd expo start --web --clear
```

Mantenha o terminal aberto enquanto utiliza o aplicativo. Caso o navegador não abra automaticamente, utilize o endereço exibido pelo Expo.

### No celular — Android

Com as dependências instaladas, execute:

```powershell
npm.cmd start
npx.cmd expo start --go --clear --port 8082
```

Abra o **Expo Go compatível com o SDK 54** e leia o QR Code exibido no terminal. Para uma conexão pela rede local, mantenha o celular e o computador na mesma rede Wi-Fi.


## ✅ Requisitos Mínimos no Código

|Recursos do celular: 
[src/Workspace.js](src/Workspace.js): `Linking.openURL` abre o WhatsApp. [src/StudentPhotoPicker.js](src/StudentPhotoPicker.js) também acessa a galeria para selecionar a foto do aluno.

| FlatList: 
[src/Workspace.js](src/Workspace.js): a tela `students` usa `<FlatList data={filtered}>`, `keyExtractor` e `renderItem` para listar os alunos.

| Criptografia: 
[src/auth.js](src/auth.js): `signInWithEmailAndPassword` e `createUserWithEmailAndPassword` delegam a autenticação ao Firebase Authentication.

Obs: A proteção criptográfica é fornecida pelo Firebase: a comunicação de produção usa HTTPS/TLS, as senhas são armazenadas como hashes com salt e o padrão do Authentication é uma versão modificada de scrypt. O Firestore também criptografa os dados em repouso. O app não implementa um algoritmo criptográfico próprio nem grava senhas em documentos do Firestore

| Persistência no servidor:

[src/repository.js](src/repository.js): `createStudent` e `addRecord` gravam transações no Firestore; 


## 🧪 Testes Automatizados

Os destaquei dois testes automatizados que estão separados em dois arquivos, com os seguintes objetivos:

Arquivo> 
[tests/funcoes.test.cjs](tests/funcoes.test.cjs)

Objetivo: Normalizar telefones válidos; rejeitar telefone incompleto e cadastro sem nome válido.


|Arquivo> 
[tests/persistencia.test.cjs](tests/persistencia.test.cjs)

Objetivo: Recuperar aluno/treino em outra instância do repositório; preservar histórico e autoria ao salvar atualizações. |

Para executar cada arquivo separadamente:

```powershell
node --test tests/funcoes.test.cjs
node --test tests/persistencia.test.cjs


