# database/

Este projeto **não possui banco SQL nem arquivos de migration tradicionais** na versão identificada.

A persistência é feita em Google Sheets e o schema é definido por constantes/funções do Apps Script:

- `backend/MVP_A&B.gs`
- `frontend/MiniSoftware.gs` (cria `ADITIVO_WORKFLOW` V23.2)

Veja `../docs/BANCO_DADOS.md` para o schema completo e regras de migração.
