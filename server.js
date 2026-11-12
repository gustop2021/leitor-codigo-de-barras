const express = require('express');
const db = require('./db');
const https = require('https');
const fs = require('fs');
const selfsigned = require('selfsigned');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/api/produtos', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos ORDER BY nome').all();
  res.json(produtos);
});

app.get('/api/produtos/:codigo', (req, res) => {
  const produto = db.prepare('SELECT * FROM produtos WHERE codigo = ?').get(req.params.codigo);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(produto);
});

app.post('/api/produtos', (req, res) => {
  const { codigo, nome, quantidade = 0 } = req.body;
  if (!codigo || !nome) {
    return res.status(400).json({ erro: 'Código e nome são obrigatórios' });
  }
  try {
    db.prepare('INSERT INTO produtos (codigo, nome, quantidade) VALUES (?, ?, ?)')
      .run(codigo, nome, quantidade);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ erro: 'Esse código já está cadastrado' });
    }
    res.status(500).json({ erro: 'Erro ao cadastrar' });
  }
});

app.post('/api/movimentar', (req, res) => {
  const { codigo, tipo, quantidade = 1 } = req.body;

  if (!['entrada', 'saida'].includes(tipo) || !Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  const produto = db.prepare('SELECT * FROM produtos WHERE codigo = ?').get(codigo);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

  const novaQtd = tipo === 'entrada'
    ? produto.quantidade + quantidade
    : produto.quantidade - quantidade;

  if (novaQtd < 0) {
    return res.status(400).json({ erro: `Estoque insuficiente (atual: ${produto.quantidade})` });
  }

  db.prepare('UPDATE produtos SET quantidade = ? WHERE codigo = ?').run(novaQtd, codigo);
  res.json({ ok: true, nome: produto.nome, quantidade: novaQtd });
});

function carregarCertificado() {
  if (!fs.existsSync('key.pem') || !fs.existsSync('cert.pem')) {
    const pems = selfsigned.generate(
      [{ name: 'commonName', value: 'estoque.local' }],
      { days: 365, keySize: 2048 }
    );
    fs.writeFileSync('key.pem', pems.private);
    fs.writeFileSync('cert.pem', pems.cert);
  }
  return { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') };
}

https.createServer(carregarCertificado(), app).listen(3000, '0.0.0.0', () => {
  console.log('Servidor rodando em https://localhost:3000');
});