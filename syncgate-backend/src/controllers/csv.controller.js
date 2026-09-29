const csvService = require('../services/csv.service');

// Funções auxiliares para exportação: configuram os headers HTTP
// para download de arquivo CSV e enviam o conteúdo.

async function exportarUsuarios(req, res, next) {
  try {
    const csv = await csvService.exportarUsuarios();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"');
    res.send(csv);
  } catch (erro) {
    next(erro);
  }
}

async function exportarCartoes(req, res, next) {
  try {
    const csv = await csvService.exportarCartoes();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cartoes.csv"');
    res.send(csv);
  } catch (erro) {
    next(erro);
  }
}

async function exportarDispositivos(req, res, next) {
  try {
    const csv = await csvService.exportarDispositivos();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dispositivos.csv"');
    res.send(csv);
  } catch (erro) {
    next(erro);
  }
}

async function exportarHistorico(req, res, next) {
  try {
    const csv = await csvService.exportarHistorico();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="historico-acessos.csv"');
    res.send(csv);
  } catch (erro) {
    next(erro);
  }
}


// Funções de importação: recebem o arquivo via multer (req.file),
// passam o buffer para o service e devolvem o resultado.

async function importarUsuarios(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }
    const resultado = await csvService.importarUsuarios(req.file.buffer);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

async function importarCartoes(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }
    const resultado = await csvService.importarCartoes(req.file.buffer);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

async function importarDispositivos(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }
    const resultado = await csvService.importarDispositivos(req.file.buffer);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}


module.exports = {
  exportarUsuarios,
  exportarCartoes,
  exportarDispositivos,
  exportarHistorico,
  importarUsuarios,
  importarCartoes,
  importarDispositivos,
};
