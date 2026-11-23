require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Permite que o seu site no GitHub Pages acesse este servidor
app.use(cors());
app.use(express.json());

// Conexão com o MongoDB Atlas (a URL será colocada nas variáveis do Render)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas com sucesso!'))
  .catch((err) => console.error('Erro ao conectar no MongoDB:', err));

// Modelo dos dados que serão salvos no banco (adapte os campos se precisar)
const RegistroSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  valor: { type: Number, required: true },
  criadoEm: { type: Date, default: Date.now }
});

const Registro = mongoose.model('Registro', RegistroSchema);

// Rota de teste para verificar se o servidor está online
app.get('/', (req, res) => {
  res.send('API online e funcionando!');
});

// Rota GET: Busca os dados salvos no banco (ex: Top 10 ordenado pelo maior valor)
app.get('/dados', async (req, res) => {
  try {
    const lista = await Registro.find().sort({ valor: -1 }).limit(10);
    res.json(lista);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar dados no banco' });
  }
});

// Rota POST: Recebe dados do seu site e salva no banco
app.post('/dados', async (req, res) => {
  try {
    const { nome, valor } = req.body;
    const novoRegistro = await Registro.create({ nome, valor });
    res.status(201).json(novoRegistro);
  } catch (error) {
    res.status(400).json({ erro: 'Erro ao salvar dados no banco' });
  }
});

// Inicia o servidor na porta fornecida pelo Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
