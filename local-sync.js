const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permitir imagens em base64 grandes

// Rota para salvar localmente SEM fazer push (preserva dados enquanto o usuário não aprova)
app.post('/save-local', (req, res) => {
  const { posts } = req.body;
  const dir = 'public';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/db.json`, JSON.stringify(posts, null, 2));
  console.log('[AJIN SYNC] db.json salvo localmente (sem push).');
  res.json({ success: true, message: 'Salvo localmente.' });
});

// Rota para sincronizar COM git push (quando o usuário aprova)
app.post('/sync', (req, res) => {
  const { actions, posts } = req.body;
  
  // 1. Salvar o JSON em public/db.json
  const dir = 'public';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/db.json`, JSON.stringify(posts, null, 2));
  
  // 2. Executar comandos Git
  let commitMsg = '';
  if (actions && actions.length > 0) {
    const hasPost = actions.includes('post');
    const hasUpdate = actions.includes('update');
    const hasDelete = actions.includes('delete');

    if (hasPost && hasUpdate && hasDelete) {
      commitMsg = 'post, update e delete';
    } else if (hasPost && hasUpdate) {
      commitMsg = 'post e update';
    } else if (hasPost && hasDelete) {
      commitMsg = 'post e delete';
    } else if (hasUpdate && hasDelete) {
      commitMsg = 'update e delete';
    } else if (hasPost) {
      commitMsg = 'post';
    } else if (hasUpdate) {
      commitMsg = 'update';
    } else if (hasDelete) {
      commitMsg = 'deletando post';
    } else {
      commitMsg = 'sincronização automática';
    }
  } else {
    // fallback
    commitMsg = req.body.action === 'delete' ? 'delete de post' : 'adição de post';
  }
  
  const cmd = `git add public/db.json && git commit -m "${commitMsg}" && git push origin main`;
  
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Erro no git:', stderr);
      return res.status(500).json({ error: stderr });
    }
    console.log('Git push sucesso:', stdout);
    res.json({ success: true, message: 'Sincronizado com sucesso!' });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[AJIN SYNC] Servidor local rodando na porta ${PORT}`);
});
