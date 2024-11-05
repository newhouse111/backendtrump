// index.js

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Inicializa o aplicativo Express
const app = express();

// Configura o CORS para permitir conexões de qualquer origem (ajuste para produção)
app.use(cors());

// Cria o servidor HTTP
const server = http.createServer(app);

// Inicializa o Socket.io com configurações de CORS
const io = new Server(server, {
  cors: {
    origin: 'https://testssawdwasd.netlify.app', // Para produção, especifique o domínio do frontend
    methods: ['GET', 'POST']
  }
});

// Estado do Jogo
let healthEsquerda = 100;
let healthDireita = 100;

// Usuários: socket.id -> username
let users = {};

// Função para gerar nomes únicos
const generateUsername = () => `user_${Math.floor(Math.random() * 10000)}`;

// Gerenciar conexões
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Atribuir um nome de usuário único
  const username = generateUsername();
  users[socket.id] = username;

  // Enviar o estado inicial e o nome de usuário para o cliente recém-conectado
  socket.emit('init', { 
    username, 
    healthEsquerda, 
    healthDireita 
  });

  // Notificar todos os clientes sobre a nova conexão
  io.emit('user connected', { username });

  // Lidar com o evento 'fire'
  socket.on('fire', (data) => {
    const { side } = data; // 'left' ou 'right'
    console.log(`${users[socket.id]} disparou em ${side}`);

    if (side === 'left') {
      healthEsquerda = Math.max(healthEsquerda - 10, 0);
      if (healthEsquerda === 0) {
        io.emit('winner', { winner: 'Esquerda' });
        // Resetar o jogo ou implementar lógica adicional
        healthEsquerda = 100;
        healthDireita = 100;
      }
    } else if (side === 'right') {
      healthDireita = Math.max(healthDireita - 10, 0);
      if (healthDireita === 0) {
        io.emit('winner', { winner: 'Direita' });
        // Resetar o jogo ou implementar lógica adicional
        healthEsquerda = 100;
        healthDireita = 100;
      }
    }

    // Atualizar a saúde para todos os clientes
    io.emit('update health', { 
      healthEsquerda, 
      healthDireita 
    });

    // Emitir o evento 'fire' para todos os clientes com detalhes
    io.emit('fire', { 
      username: users[socket.id], 
      side 
    });
  });

  // Lidar com mensagens de chat
  socket.on('chat message', (msg) => {
    const user = users[socket.id];
    const message = msg.trim();
    if (message.length > 0) {
      console.log(`Mensagem de ${user}: ${message}`);
      io.emit('chat message', { username: user, message });
    }
  });

  // Lidar com a desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    const username = users[socket.id];
    delete users[socket.id];
    io.emit('user disconnected', { username });
  });
});

// Define a porta do servidor
const PORT = process.env.PORT || 4000;

// Inicia o servidor
server.listen(PORT, () => console.log(`Servidor ouvindo na porta ${PORT}`));
