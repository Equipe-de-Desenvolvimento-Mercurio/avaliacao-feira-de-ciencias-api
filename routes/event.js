    import pool from "../config/db.js";

    import express from "express";

    const router = express.Router();

    const STATUS_EVENTOS = ["planejado", "em_andamento", "encerrado"];

    // Criar Evento
    router.post("/", async (req, res) => {
        const { nome_evento, data_evento, status = "planejado" } = req.body;

        if (!nome_evento || typeof nome_evento !== "string" || nome_evento.length > 150) {
            return res.status(400).json({
                error: "Nome do evento inválido"
            });
        }

        if (!verificarData(data_evento)) {aa
            return res.status(400).json({
                error: "Data do evento inválida. Use o formato YYYY-MM-DD"
            });
        }

        if (!STATUS_EVENTOS.includes(status)) {
            return res.status(400).json({
                error: "Status do evento inválido"
            });
        }

        const evento = await pool.query(
            "INSERT INTO evento (nome_evento, data_evento, status) VALUES ($1, $2, $3) RETURNING *",
            [nome_evento, data_evento, status]
        );

        return res.status(201).json(evento.rows[0]);
    });

    // {
    //     "nome_evento":"SIC 2026",
    //     "data_evento":"29-09-2026"
    // }

    // Pegar Eventos por id
    router.get("/:id", async (req, res) => {
        let id = req.params.id;

        let id_events = await pool.query("SELECT (id_evento) FROM participacao_evento WHERE id_usuario = $1", [id]);

        if (id_events.rowCount == 0){
            return res.status(404).json({
                error: "Não tem eventos para esse usuario"
            });
        }

        let row = id_events.rows;
        let arr = [];
        for (let i = 0; i < row.length; i++){
            let data = pool.query("SELECT * FROM evento WHERE id_evento = $1", [row[i].id_evento]);
            arr.push((await data).rows[0])
        }
        return res.json(arr);

    });

    // Dentinar Evento para Professor
    router.post("/usuario/:id_professor/:id_evento", async (req, res) => {
        let { id_professor, id_evento } = req.params;

        let usuario = await pool.query("SELECT * FROM usuario WHERE id_usuario = $1", [id_professor]);
        if (usuario.rowCount == 0){
            return res.status(404).json({
                error: "Usuario não encontrado"
            })
        }

        let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [id_evento]);
        if (evento.rowCount == 0){
            return res.status(404).json({
                error: "Evento não encontrado"
            })
        }

        let participacao = await pool.query("SELECT * FROM participacao_evento WHERE id_usuario = $1 AND id_evento = $2", [id_professor, id_evento]);
        if (participacao.rowCount != 0){
            return res.status(400).json({
                error: "Participação já existe"
            })
        }

        let data = await pool.query("INSERT INTO participacao_evento (id_usuario, id_evento) VALUES ($1, $2) RETURNING *", [id_professor, id_evento]);

        return res.status(201).json({
            message: "Participação adicionada com sucesso"
        });
    });


    function verificarData(date){
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return false;
        }

        const [year, month, day] = date.split("-").map(Number);
        const parsedDate = new Date(Date.UTC(year, month - 1, day));

        return parsedDate.getUTCFullYear() === year
            && parsedDate.getUTCMonth() === month - 1
            && parsedDate.getUTCDate() === day;
    }

    export default router;