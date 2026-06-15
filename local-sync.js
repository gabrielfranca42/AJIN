const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permitir imagens em base64 grandes

app.post('/sync', (req, res) => {
  const { action, posts } = req.body;
  
  // 1. Salvar o JSON em public/db.json
  const dir = 'public';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(`${dir}/db.json`, JSON.stringify(posts, null, 2));
  
  // 2. Executar comandos Git
  const commitMsg = action === 'delete' ? 'delete de post' : 'adição de post';
  
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
