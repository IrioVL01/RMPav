# 🛣️ RMPav Web - Sistema de Engenharia Rodoviária

![Badge Concluído](http://img.shields.io/static/v1?label=STATUS&message=CONCLUÍDO&color=GREEN&style=for-the-badge)
![Badge License](http://img.shields.io/static/v1?label=LICENSE&message=MIT&color=BLUE&style=for-the-badge)

> Uma plataforma SaaS Fullstack para dimensionamento de pavimentos e cálculo de tráfego rodoviário, gerando memoriais descritivos automáticos em PDF.

---

## 💻 Sobre o Projeto

O **RMPav Web** é uma solução desenvolvida para automatizar processos complexos de engenharia civil. O sistema elimina a necessidade de planilhas manuais propensas a erros, oferecendo uma interface moderna para calcular o **Número N** (Tráfego) e o **Dimensionamento de Revestimento Primário** (Método USACE).

O diferencial técnico do projeto é a integração completa entre um Frontend dinâmico e um Backend robusto, capaz de processar dados matemáticos e gerar documentação oficial (PDF) em tempo real.

### 🌐 Demo Online
O projeto está rodando em produção. Acesse e teste:
👉 ** https://vercel.com/iriovl01s-projects/rm-pav **

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando uma arquitetura moderna de microsserviços e SPA (Single Page Application).

### **Frontend (Client-side)**
-   ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) **React.js + Vite:** Para uma interface rápida e reativa.
-   ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) **Tailwind CSS:** Para estilização profissional e responsiva.
-   **Fetch API:** Para comunicação assíncrona com o Backend.

### **Backend (Server-side)**
-   ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) **Python 3:** Linguagem base para a lógica matemática.
-   ![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white) **Django REST Framework:** Criação da API RESTful.
-   **xhtml2pdf:** Biblioteca para geração dinâmica de relatórios em PDF baseados em templates HTML.
-   **Pandas/Math:** Processamento de dados de engenharia.

### **Infraestrutura & Deploy**
-   ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) **Vercel:** Hospedagem do Frontend.
-   ![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white) **Render:** Hospedagem do Backend (Gunicorn + WhiteNoise).

---

## ⚙️ Funcionalidades Principais

-   ✅ **Cálculo de Tráfego (Número N):**
    -   Suporte para 27 classes de veículos (DNIT).
    -   Tabela dinâmica (Adicionar/Remover veículos).
    -   Cálculo automático de Fator de Veículo e Fator Climático.
-   ✅ **Dimensionamento (USACE):**
    -   Cálculo de espessura de Revestimento Primário.
    -   Algoritmo de previsão de perda de material (Gravel Loss).
-   ✅ **Geração de Relatórios:**
    -   Botão "Baixar Memorial Descritivo".
    -   Backend renderiza um PDF diagramado com todos os dados da sessão.
-   ✅ **UX/UI:**
    -   Interface limpa com Feedback visual de carregamento e erros.
    -   Botão de Reset de Projeto.

---

## 🚀 Como rodar o projeto localmente

Pré-requisitos: `Node.js` e `Python` instalados.

### 1. Clone o repositório
```bash
git clone https://github.com/IrioVL01/RMPav.git
cd RMPav

### 2. Configure o Backend (Django)
Abra o terminal na pasta raiz do projeto e execute:

```bash
cd backend
python -m venv venv

# Ative o ambiente virtual:
# No Windows:
venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate

# Instale as dependências e rode o servidor:
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# O servidor rodará em http://127.0.0.1:8000

### 3. Configure o Frontend (React)
Abra um novo terminal (mantenha o anterior rodando) e execute:
cd frontend
npm install
npm run dev

# O site rodará em http://localhost:5173
