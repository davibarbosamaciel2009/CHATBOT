const API_URL = 'http://localhost:3000';

const cadastroForm = document.querySelector('#cadastro-form');
const loginForm = document.querySelector('#login-form');
const mensagem = document.querySelector('#mensagem');

function mostrarMensagem(texto, sucesso = false) {
    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.className = `mensagem-formulario ${sucesso ? 'sucesso' : 'erro'}`;
}

async function enviarFormulario(endpoint, dados) {
    let resposta;

    try {
        resposta = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
    } catch {
        throw new Error('Servidor offline. Execute "npm start" e tente novamente.');
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(resultado.erro || 'Não foi possível concluir a operação.');
    }

    return resultado;
}

cadastroForm?.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const botao = cadastroForm.querySelector('button');
    botao.disabled = true;
    mostrarMensagem('Enviando cadastro...', true);

    try {
        const dados = Object.fromEntries(new FormData(cadastroForm));
        await enviarFormulario('cadastro', dados);
        window.location.href = 'login.html?cadastro=sucesso';
    } catch (erro) {
        mostrarMensagem(erro.message);
        botao.disabled = false;
    }
});

loginForm?.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const botao = loginForm.querySelector('button');
    botao.disabled = true;
    mostrarMensagem('Validando acesso...', true);

    try {
        const dados = Object.fromEntries(new FormData(loginForm));
        const resultado = await enviarFormulario('login', dados);
        sessionStorage.setItem('usuarioLogado', resultado.usuario);
        mostrarMensagem(`Login realizado com sucesso! Bem-vindo, ${resultado.usuario}.`, true);
        loginForm.reset();
        botao.disabled = false;
    } catch (erro) {
        mostrarMensagem(erro.message);
        botao.disabled = false;
    }
});

if (new URLSearchParams(window.location.search).get('cadastro') === 'sucesso') {
    mostrarMensagem('Cadastro realizado! Entre com seu e-mail e senha.', true);
}
