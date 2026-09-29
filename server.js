import express from 'express';
import cors from 'cors';
import 'dotenv/config';


const app = express();

process.env.NODE_TLS_REJECT_UNAUTHORIZED= '0'

const PORT = process.env.PORT || 3000;
const URL_API = "https://api.groq.com/openai/v1/chat/completions";

const MODELO = "openai/gpt-oss-120b";

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const usuarios = [];


app.post('/cadastro', (req, res) => {
    const { usuario, email, senha } = req.body;

    if (!usuario || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos!" });
    }

    if (senha.length < 6) {
        return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres!" });
    }

    const emailExiste = usuarios.find((busca) => busca.email.toLowerCase() === email.toLowerCase());

    if (emailExiste) {
        return res.status(409).json({ erro: "E-mail já cadastrado!" });
    }

    usuarios.push({ usuario, email, senha });
    console.log("Usuários no sistema:", usuarios);

    return res.status(201).json({ mensagem: "Cadastro realizado com sucesso!" });
});


app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: "Preencha e-mail e senha para entrar!" });
    }

    const usuarioEncontrado = usuarios.find((busca) => busca.email.toLowerCase() === email.toLowerCase());

    if (!usuarioEncontrado || usuarioEncontrado.senha !== senha) {
        return res.status(401).json({ erro: "E-mail ou senha incorretos!" });
    }

    return res.json({
        mensagem: "Login realizado com sucesso!",
        usuario: usuarioEncontrado.usuario
    });
});


app.post('/chat', async (req, res) => {
    try {
        const API_KEY = process.env.GROQ_API_KEY;
        const historico = req.body?.historico;

        if (!API_KEY) {
            return res.status(500).json({ erro: 'GROQ_API_KEY não configurada no arquivo .env.' });
        }

        if (!Array.isArray(historico) || historico.length === 0 || historico.length > 20) {
            return res.status(400).json({ erro: 'Histórico inválido. Envie até 20 mensagens.' });
        }

        const mensagensValidas = historico.every((mensagem) =>
            mensagem &&
            ['user', 'assistant'].includes(mensagem.role) &&
            typeof mensagem.content === 'string' &&
            mensagem.content.trim().length > 0 &&
            mensagem.content.length <= 4000
        );

        if (!mensagensValidas || historico.at(-1).role !== 'user') {
            return res.status(400).json({ erro: 'Mensagem inválida.' });
        }

        const persona = [
            {
                role: "system",
                content: 'Você é Peter Parker, o Homem-Aranha. Responda em português brasileiro, com humor leve e uma tirada rápida quando couber. Seja direto: no máximo 2 frases curtas e 35 palavras. Sem introduções, repetição ou listas. Nunca diga que é o Hulk.'
            }
        ];

       
        persona.push(...historico);

        const respostaBruta = await fetch(URL_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODELO,
                messages: persona,
                max_completion_tokens: 120,
                reasoning_effort: 'low'
            })
        });

        const resultado = await respostaBruta.json();

        if (!respostaBruta.ok) {
            console.error('Erro retornado pela Groq:', resultado.error?.message || respostaBruta.status);
            return res.status(502).json({ erro: resultado.error?.message || 'Erro na comunicação com a Groq.' });
        }

        const resposta = resultado.choices?.[0]?.message?.content;
        if (typeof resposta !== 'string' || !resposta.trim()) {
            return res.status(502).json({ erro: 'A Groq retornou uma resposta vazia.' });
        }

        return res.json({ resposta });

    } catch (erro) {
        const erroDeCertificado = [
            'SELF_SIGNED_CERT_IN_CHAIN',
            'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
            'CERT_HAS_EXPIRED'
        ].includes(erro.cause?.code);

        console.error('Falha ao consultar a Groq:', erro.cause?.code || erro.message);
        if (erroDeCertificado) {
            return res.status(502).json({ erro: 'Certificado TLS da rede não confiável. Configure a CA no Windows/Node e reinicie o servidor.' });
        }

        return res.status(502).json({ erro: 'Não foi possível conectar à Groq. Verifique a conexão e tente novamente.' });
    }
});

app.listen(PORT, () => {
    console.log(` Servidor rodando `);
   
});