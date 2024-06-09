
const express = require('express');
const app = express();
const Servidor = require('http').createServer(app)
const socket = require('socket.io')(Servidor)
const moment = require('moment')
const mysql = require('mysql2/promise');

const cors = require('cors');
const bodyParserErrorHandler = require('express-body-parser-error-handler')

var CryptoJS = require("crypto-js");
var base64 = require('base-64');
const fetch = require("node-fetch");

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const knex = require("knex")

let today = new Date()

monName = new Array("01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12")

function getRandomInt() {
    today = new Date()
    return ((today.getHours()) < 10 ? '0' + (today.getHours()) : (today.getHours())) + ":" + (today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? '0' + today.getSeconds() : today.getSeconds())
}

function getData() {
    today = new Date()
    return ((today.getFullYear()) + "-" + (monName[today.getMonth()]) + "-" + (today.getDate() < 10 ? '0' + today.getDate() : today.getDate()))
}


app.use(cors());
app.use(bodyParserErrorHandler());

app.use((req, res, next) => {
    res.header('Acces-Control-Allow-Origin', '*');
    res.header(
        'Acces-Control-Allow-Header',
        'Origin, X-Requrested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.header('Acces-Control-Allow-Methods', 'PUT', 'POST', 'PATCH', 'DELETE', 'GET');
        return res.status(200).send({});
    }
    next();
})

function Descriptografar(MENSAGEM) {
    try {
        var decript = JSON.parse(CryptoJS.AES.decrypt(base64.decode(MENSAGEM), "a53650a05d0c2d20b93433e828e2ab79f89d3f2669b82dbcba9a560b186dad8fa7701eda833a7b7994eda0538260d4c870f0c273248bbcd69fb34ac10a1bc11e").toString(CryptoJS.enc.Utf8))
    } catch (err) {
        console.log("Erro ao Descriptografar: " + err)
    }
    return decript
}

function Criptografar(MENSAGEM) {

    return base64.encode(CryptoJS.AES.encrypt(JSON.stringify(MENSAGEM), "a53650a05d0c2d20b93433e828e2ab79f89d3f2669b82dbcba9a560b186dad8fa7701eda833a7b7994eda0538260d4c870f0c273248bbcd69fb34ac10a1bc11e"))
}

const pool = mysql.createPool({
    host: 'mysql-mn8h.railway.internal',
    //host: 'monorail.proxy.rlwy.net',
    user: 'root',
    password: 'zOSDfyNbJkAwWKtPQWkBaqXtvcIawmiJ',
    database: 'railway',
    port: 3306,
    //port: 16800,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0
});


var conexoes = []

const Cliente_Site = {
    Cliente: {}
}


class Database {
    constructor() {
        if (!Database.instance) {
            this.pool = mysql.createPool({
                host: 'mysql-mn8h.railway.internal',
                //host: 'monorail.proxy.rlwy.net',
                user: 'root',
                password: 'zOSDfyNbJkAwWKtPQWkBaqXtvcIawmiJ',
                database: 'railway',
                port: 3306,
                //port: 16800,
                waitForConnections: true,
                connectionLimit: 50,
                queueLimit: 0
            });
            Database.instance = this;
        }
        return Database.instance;
    }

    async query(sql, values = []) {
        const connection = await this.pool.getConnection();
        try {
            const [rows, fields] = await connection.query(sql, values);
            return rows;
        } catch (error) {
            console.error('Erro na consulta:', error);
            throw error;
        } finally {
            connection.release();
        }
    }


}


class NovaEscola {
    constructor(data, Socket) {
        this.data = data
        this.socket = Socket
        this.db = new Database();
    }

    async handlerLogin() {

        if (Descriptografar(this.data.Code) !== '9856325646516') return

        try {
            const QueryLogin = 'SELECT * FROM User where Login=? AND Senha=?;';
            const LoginValor = [Descriptografar(this.data.Login), Descriptografar(this.data.Senha)];
            const ExecutarLogin = await this.db.query(QueryLogin, LoginValor);

            if (ExecutarLogin.length > 0) {

                Cliente_Site.Cliente[this.socket.id] = { nome: Descriptografar(this.data.Login), socketID: this.socket.id }

                this.socket.emit(`AccessLogin`, {
                    Code: Criptografar('98563256465'),
                    data: Criptografar(ExecutarLogin)
                })
                console.log(`[${Descriptografar(this.data.Data)} - ${Descriptografar(this.data.Horas)}] - [${Descriptografar(this.data.Login)}] -  Login Efetuado com Sucesso!`)
            } else {

                this.socket.emit(`AccessLogin`, {
                    Code: Criptografar('98563256465'),
                    data: Criptografar(0)
                })
            }
        } catch (error) {
            console.error(`Erro encontrado bloco 01 handlerLogin : ${error}`)
        }

    }

    async handlerEntradaRequest() {

        try {

            if (Descriptografar(this.data.Code) !== '9856334874') return


            const ValorAluno = [Descriptografar(this.data.Codigo).substring(1), Descriptografar(this.data.Escola)];
            const QueryAluno = 'SELECT * FROM cadastro where Codigo=? AND Escola=?;';
            const ResultadoAluno = await this.db.query(QueryAluno, ValorAluno);

            if (ResultadoAluno.length === 0) {
                // Audio Aluno não encontrado
                console.log(`[${Descriptografar(this.data.Data)} - ${Descriptografar(this.data.Horas)}] - [${Descriptografar(this.data.Codigo).substring(1)}] - [${Descriptografar(this.data.Escola)}] -  Aluno não encontrado`)
                this.socket.emit(`AlunoNaoEncontrado`, { // entrega a requisição para o cliente
                    Code: Criptografar('9856321450'),
                })
                return
            }

            const QueryToken = 'SELECT Token FROM token where Codigo=?;';
            const ResultadoToken = await this.db.query(QueryToken, Descriptografar(this.data.Codigo).substring(1));

            if (ResultadoToken.length > 0) {
                for (let i = 0; i < ResultadoToken.length; i++) {
                    EnviarNotificaEntrada(ResultadoToken[i]["Token"], ResultadoAluno[0].Aluno, Descriptografar(this.data.Horas))
                }
            }

            if (moment(ResultadoAluno[0].Carteirinha).isAfter(Descriptografar(this.data.Data))) {

                this.socket.emit(`EntradaResponse`, { // entrega a requisição para o cliente
                    Code: Criptografar('9856321452'),
                    Resultado: Criptografar(ResultadoAluno),
                })

                const InfoQueryInsert = [ResultadoAluno[0].Codigo, ResultadoAluno[0].Aluno, ResultadoAluno[0].Turma, ResultadoAluno[0].Turno, Descriptografar(this.data.Horas), "", ResultadoAluno[0].Atrasos, Descriptografar(this.data.Data), "NAO", ResultadoAluno[0].Escola]
                const QueryInserirRegistro = 'INSERT INTO entrada (Codigo, Nome, Turma, Turno, Horas, Entrada, Atrasos, Dia, Digitado, Escola) VALUES (?,?,?,?,?,?,?,?,?,?);'
                const ResultadoInserir = await this.db.query(QueryInserirRegistro, InfoQueryInsert)

                if (ResultadoInserir) {
                    console.log(`[${Descriptografar(this.data.Data)} - ${Descriptografar(this.data.Horas)}] - [${ResultadoAluno[0].Aluno}] - [${ResultadoAluno[0].Escola}] - Acabou de entrar na escola`)

                    const UpdateQuery = 'UPDATE cadastro SET Entradas=? where Codigo=?;'
                    const ValorUpdate = ["1", Descriptografar(this.data.Codigo).substring(1)]
                    await this.db.query(UpdateQuery, ValorUpdate)
                }

            } else {

                console.log(`[${Descriptografar(this.data.Data)} - ${Descriptografar(this.data.Horas)}] - [${ResultadoAluno[0].Aluno}] - [${ResultadoAluno[0].Escola}] -  Carteirinha Vencida!`)

                this.socket.emit(`CarteirinhaVencida`, { // entrega a requisição para o cliente
                    Code: Criptografar('9856321451'),
                    Resultado: Criptografar(ResultadoAluno),
                })
            }

        } catch (error) {
            console.error(`Erro encontrado bloco 01 handlerEntradaRequest: ${error}`);

        }

    }

    async handlerSaidaRequest() {

        try {

            if (Descriptografar(this.data.Code) !== '9856334874') return

            const ValorAluno = [Descriptografar(this.data.Codigo).substring(1), Descriptografar(this.data.Escola)];
            const QueryAluno = 'SELECT * FROM cadastro where Codigo=? AND Escola=?;';
            const ResultadoAluno = await this.db.query(QueryAluno, ValorAluno);

            if (ResultadoAluno.length === 0) {
                // Audio Aluno não encontrado
                console.log(`[${Descriptografar(this.data.Data)} - ${Descriptografar(this.data.Horas)}] - [${Descriptografar(this.data.Codigo).substring(1)}] -  Aluno não encontrado`)
                this.socket.emit(`AlunoNaoEncontrado`, { // entrega a requisição para o cliente
                    Code: Criptografar('9856321450'),
                })
                return
            }

            const QueryToken = 'SELECT Token FROM token where Codigo=?;';
            const ResultadoToken = await this.db.query(QueryToken, Descriptografar(this.data.Codigo).substring(1));

            if (ResultadoToken.length > 0) {
                for (let i = 0; i < ResultadoToken.length; i++) {
                    EnviarNotificaEntrada(ResultadoToken[i]["Token"], ResultadoAluno[0].Aluno, Descriptografar(this.data.Horas))
                }
            }

            this.socket.emit(`SaidaResponse`, { // entrega a requisição para o cliente
                Code: Criptografar('9856321452'),
                Resultado: Criptografar(ResultadoAluno),
            })

            const InfoQueryInsert = [ResultadoAluno[0].Codigo, ResultadoAluno[0].Aluno, ResultadoAluno[0].Turma, ResultadoAluno[0].Turno, Descriptografar(this.data.Horas), "", ResultadoAluno[0].Atrasos, Descriptografar(this.data.Data), "NAO", ResultadoAluno[0].Escola]
            const QueryInserirRegistro = 'INSERT INTO saida (Codigo, Nome, Turma, Turno, Horas, Entrada, Atrasos, Dia, Digitado, Escola) VALUES (?,?,?,?,?,?,?,?,?,?);'
            const ResultadoInserir = await this.db.query(QueryInserirRegistro, InfoQueryInsert)

            if (ResultadoInserir) {
                console.log(`[${Descriptografar(this.data.Data)} - ${Descriptografar(this.data.Horas)}] - [${ResultadoAluno[0].Aluno}] - [${ResultadoAluno[0].Escola}] - Acabou de Sair na escola`)

                const UpdateQuery = 'UPDATE cadastro SET Entradas=? where Codigo=?;'
                const ValorUpdate = ["0", Descriptografar(this.data.Codigo).substring(1)]
                await this.db.query(UpdateQuery, ValorUpdate)
            }


        } catch (error) {
            console.error(`Erro encontrado bloco 01 handlerSaidaRequest: ${error}`);

        }
    }

    async obterNumeroConexoes() {
        try {
            const rows = await this.db.query(`
                SELECT
                    COUNT(*) AS total_conexoes,
                    SUM(CASE WHEN state = 'sleeping' THEN 1 ELSE 0 END) AS conexoes_dormindo,
                    SUM(CASE WHEN state != 'sleeping' THEN 1 ELSE 0 END) AS conexoes_ativas
                FROM
                    information_schema.processlist;
            `);

            // Exibir os resultados

            return rows
        } catch (error) {
            console.error('Erro ao obter o número de conexões:', error);
        }
    }
}


socket.on('connection', (Socket) => {

    // site

    Socket.on('EntradaRequest', (data) => new NovaEscola(data, Socket).handlerEntradaRequest())

    Socket.on('SaidaRequest', (data) => new NovaEscola(data, Socket).handlerSaidaRequest())

    Socket.on('Login', (data) => new NovaEscola(data, Socket).handlerLogin());

    Socket.on('RegistrarEscola', (data) => handlerRegistroEscola(data, Socket));

    Socket.on('Validar', (data) => handlerValidar(data, Socket));

    // aplicativo

    Socket.on('UltimaEntrada', (data) => handlerUltimaEntrada(data, Socket));

    Socket.on('UltimaSaida', (data) => handlerUltimaSaida(data, Socket));

    Socket.on('RegistroToken', (data) => handlerRegistroToken(data));

    Socket.on('RegistrosAvisos', (data) => handlerRegistrosAvisos(data, Socket));

    Socket.on('RegistrosRegistro', (data) => handlerRegistrosRegistro(data, Socket));

    Socket.on('disconnect', async () => {

        conexoes = conexoes.filter((e) => e.Token !== Socket.id)

        const infoPool = await new NovaEscola([], Socket).obterNumeroConexoes()
        console.log('')
        console.log(`[SOCKETS] - [DESCONECTADO] = ${Socket.id} - [Socket Ativos] = ${conexoes.length}`);
        console.log(`[MYSQL] - [Total de conexões] = ${infoPool[0].total_conexoes} - [Conexões dormindo] = ${infoPool[0].conexoes_dormindo} - [Conexões ativas] = ${infoPool[0].conexoes_ativas}`);
        console.log('')
        console.log('---------------------------------------------------------')
    });

})

socket.on('connect', async (Socket) => {

    conexoes.push({ Token: Socket.id })

    const infoPool = await new NovaEscola([], Socket).obterNumeroConexoes()
    console.log('')
    console.log(`[SOCKETS] - [CONECTADO] = ${Socket.id} - [Socket Ativos] = ${conexoes.length}`);
    console.log(`[MYSQL] - [Total de conexões] = ${infoPool[0].total_conexoes} - [Conexões dormindo] = ${infoPool[0].conexoes_dormindo} - [Conexões ativas] = ${infoPool[0].conexoes_ativas}`);
    console.log('')
    console.log('---------------------------------------------------------')

});




// Evento para encerrar a conexão e desconectar o socket quando o servidor é desligado
process.on('SIGINT', () => {
    process.exit();
});

// Evento para encerrar a conexão e desconectar o socket quando ocorre um erro não tratado
process.on('uncaughtException', (err) => {
    console.error('Erro não tratado:', err);
    process.exit(1);
});



Servidor.listen(3001, () => {
    console.log("Servidor com a Porta 3001 em Execução")
});
/*
setInterval(async function () { // Saida Matutino
    var today = new Date()

    //console.log((today.getHours()+4 + ":" + today.getMinutes()  + ":" + today.getSeconds()))
    var HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
    const Saida = await database.select("*").from("saidaescola").catch((err) => console.error(err))

    for (let i = 0; i < Saida.length; i++) {

        today = new Date()
        if (HoraAtual == Saida[i]["MatutinoHorarioSaida"]) {

            const ConsultaMatutino = await database.select("*").from("cadastro").where({ Escola: Saida[i]["Escola"], Entradas: "1", Turno: "M" })

            for (let j = 0; j < ConsultaMatutino.length; j++) {

                await database("cadastro").update({ Entradas: "0" }).where({ Codigo: ConsultaMatutino[j]["Codigo"] })

                const Token = await database.select("Token").from("token").where({ Codigo: ConsultaMatutino[j]["Codigo"] }).catch((err) => console.error(err))

                for (let k = 0; k < Token.length; k++) {
                    today = new Date()
                    HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
                    EnviarNotificaSaida(Token[k]["Token"], ConsultaMatutino[j]["Aluno"], HoraAtual)

                }
            }
        }
    }

}, 1000)

setInterval(async function () { // Saida Vespertino
    var today = new Date()

    //console.log((today.getHours()+4 + ":" + today.getMinutes()  + ":" + today.getSeconds()))
    var HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));

    const Saida = await database.select("*").from("saidaescola").catch((err) => console.error(err))

    for (let i = 0; i < Saida.length; i++) {

        today = new Date()
        if (HoraAtual == Saida[i]["VerspertinoHorarioSaida"]) {

            const ConsultaMatutino = await database.select("*").from("cadastro").where({ Escola: Saida[i]["Escola"], Entradas: "1", Turno: "V" })

            for (let j = 0; j < ConsultaMatutino.length; j++) {

                await database("cadastro").update({ Entradas: "0" }).where({ Codigo: ConsultaMatutino[j]["Codigo"] })

                const Token = await database.select("Token").from("token").where({ Codigo: ConsultaMatutino[j]["Codigo"] }).catch((err) => console.error(err))

                for (let k = 0; k < Token.length; k++) {
                    today = new Date()
                    HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
                    EnviarNotificaSaida(Token[k]["Token"], ConsultaMatutino[j]["Aluno"], HoraAtual)

                }
            }
        }
    }

}, 1000)

setInterval(async function () { // Saida Noturno
    var today = new Date()

    //console.log((today.getHours()+4 + ":" + today.getMinutes()  + ":" + today.getSeconds()))
    var HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));

    const Saida = await database.select("*").from("saidaescola").catch((err) => console.error(err))

    for (let i = 0; i < Saida.length; i++) {

        today = new Date()
        if (HoraAtual == Saida[i]["NoturnoHorarioSaida"]) {

            const ConsultaMatutino = await database.select("*").from("cadastro").where({ Escola: Saida[i]["Escola"], Entradas: "1", Turno: "N" })

            for (let j = 0; j < ConsultaMatutino.length; j++) {

                await database("cadastro").update({ Entradas: "0" }).where({ Codigo: ConsultaMatutino[j]["Codigo"] })

                const Token = await database.select("Token").from("token").where({ Codigo: ConsultaMatutino[j]["Codigo"] }).catch((err) => console.error(err))

                for (let k = 0; k < Token.length; k++) {
                    today = new Date()
                    HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
                    EnviarNotificaSaida(Token[k]["Token"], ConsultaMatutino[j]["Aluno"], HoraAtual)

                }
            }
        }
    }

}, 1000)
*/
setInterval(async function () {
    var today = new Date()
    const dayName = new Array("domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado")

    var HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
    var DataAtual = (today.getFullYear() + "-" + monName[today.getMonth()] + "-" + today.getDate());

    if (dayName[today.getDay()] !== "sábado" && dayName[today.getDay()] !== "domingo") {

        if (HoraAtual == '09:00:00') {

            try {

                const connection = await pool.getConnection()
                const QueryTurno = 'SELECT * FROM cadastro where Turno=?;';
                const ValorTurno = [Turno = "M"];
                const [ResultadoTurno] = await connection.query(QueryTurno, ValorTurno);


                for (let i = 0; i < ResultadoTurno.length; i++) {

                    const QueryHoras = 'SELECT * FROM entrada where Codigo=? AND (DIA BETWEEN "07:00:00" AND "09:00:00");';
                    const ValorHoras = [ResultadoTurno[i].Codigo];
                    const ResultadoHoras = await connection.query(QueryHoras, ValorHoras);



                    if (ResultadoHoras.length === 0) {
                        today = new Date();
                        HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
                        console.log(`[${DataAtual} - ${HoraAtual}] - [${results[i].Aluno}] -  Aluno Faltoso encontrado`)

                        //const query = 'SELECT * FROM entrada where Codigo=? AND (DIA BETWEEN "07:00:00" AND "09:00:00");'
                        /*connection.query(query, [Codigo= results[i].Codigo] , (error, results2) => {
                            if (error) {
                                console.error('Erro ao consultar dados:', error);
                                connection.release();
                                return;
                            }
    
                            
                        })*/
                    }

                }
                connection.release()

            } catch (error) {
                console.error(`Erro Encontrado: ${error}`)
            }
        }


        if (HoraAtual == '15:00:00') {

            try {

                const connection = await pool.getConnection()
                const QueryTurno = 'SELECT * FROM cadastro where Turno=?;';
                const ValorTurno = [Turno = "V"];
                const [ResultadoTurno] = await connection.query(QueryTurno, ValorTurno);


                for (let i = 0; i < ResultadoTurno.length; i++) {

                    const QueryHoras = 'SELECT * FROM entrada where Codigo=? AND (DIA BETWEEN "12:00:00" AND "15:00:00");';
                    const ValorHoras = [ResultadoTurno[i].Codigo];
                    const ResultadoHoras = await connection.query(QueryHoras, ValorHoras);



                    if (ResultadoHoras.length === 0) {
                        today = new Date();
                        HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
                        console.log(`[${DataAtual} - ${HoraAtual}] - [${results[i].Aluno}] -  Aluno Faltoso encontrado`)

                        //const query = 'SELECT * FROM entrada where Codigo=? AND (DIA BETWEEN "07:00:00" AND "09:00:00");'
                        /*connection.query(query, [Codigo= results[i].Codigo] , (error, results2) => {
                            if (error) {
                                console.error('Erro ao consultar dados:', error);
                                connection.release();
                                return;
                            }
    
                            
                        })*/
                    }

                }
                connection.release()

            } catch (error) {
                console.error(`Erro Encontrado: ${error}`)
            }

        }

        if (HoraAtual == '23:50:00') {

            try {

                const connection = await pool.getConnection()
                const QueryTurno = 'SELECT * FROM cadastro where Turno=?;';
                const ValorTurno = [Turno = "N"];
                const [ResultadoTurno] = await connection.query(QueryTurno, ValorTurno);


                for (let i = 0; i < ResultadoTurno.length; i++) {

                    const QueryHoras = 'SELECT * FROM entrada where Codigo=? AND (DIA BETWEEN "18:00:00" AND "21:00:00");';
                    const ValorHoras = [ResultadoTurno[i].Codigo];
                    const ResultadoHoras = await connection.query(QueryHoras, ValorHoras);



                    if (ResultadoHoras.length === 0) {
                        today = new Date();
                        HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
                        console.log(`[${DataAtual} - ${HoraAtual}] - [${results[i].Aluno}] -  Aluno Faltoso encontrado`)

                        //const query = 'SELECT * FROM entrada where Codigo=? AND (DIA BETWEEN "07:00:00" AND "09:00:00");'
                        /*connection.query(query, [Codigo= results[i].Codigo] , (error, results2) => {
                            if (error) {
                                console.error('Erro ao consultar dados:', error);
                                connection.release();
                                return;
                            }
    
                            
                        })*/
                    }

                }
                connection.release()

            } catch (error) {
                console.error(`Erro Encontrado: ${error}`)
            }

        }
    }


}, 1000)

// APLICATIVO

async function handlerRegistrosAvisos(data, Socket) {

    if (Descriptografar(data.Code) === '2434646554568775') {

        try {

            const connection = await pool.getConnection();
            const QueryAvisos = 'SELECT * FROM avisos WHERE Escola=?;';
            const ValorAvisos = [Descriptografar(data.Escola)];
            const [ResultadoAvisos] = await connection.query(QueryAvisos, ValorAvisos);

            if (ResultadoAvisos.length > 0) {
                Socket.emit(`ResponseAvisos${Descriptografar(data.Codigo)}`, {
                    Code: Criptografar('989789567756897'),
                    Data: Criptografar(ResultadoAvisos)
                })
            } else {
                Socket.emit(`ResponseAvisos${Descriptografar(data.Codigo)}`, {
                    Code: Criptografar('989789567756897'),
                    Data: Criptografar([])
                })
            }

            connection.release();
        } catch (error) {
            console.error('Erro ao consultar dados:', error);
        }
    }
}

async function handlerRegistrosRegistro(data, Socket) {


    if (Descriptografar(data.Code) === '23544236544235464') {


        try {

            const connection = await pool.getConnection();
            const QueryRegistro = 'select * from registro where Escola=? and Turma=? or Escola=? and Codigo=?';
            const ValorRegistro = [Descriptografar(data.Escola), Descriptografar(data.Turma), Descriptografar(data.Escola), Descriptografar(data.Codigo)];
            const [ResultadoRegistro] = await connection.query(QueryRegistro, ValorRegistro);

            if (ResultadoRegistro.length > 0) {
                Socket.emit(`ResponseRegistros${Descriptografar(data.Codigo)}`, {
                    Code: Criptografar('9854854651651'),
                    Data: Criptografar(ResultadoRegistro)
                })
            } else {
                Socket.emit(`ResponseRegistros${Descriptografar(data.Codigo)}`, {
                    Code: Criptografar('9854854651651'),
                    Data: Criptografar([])
                })
            }

            connection.release();

        } catch (error) {
            console.error('Erro ao consultar dados:', error);

        }
    }
}

async function handlerRegistroToken(data) {

    if (data.Code === '52261265165165') {

        pool.getConnection((erro, connection) => {
            if (erro) {
                console.log(`Erro encontrado: ${erro}`)
                connection.release();
                return
            }
            try {
                const query = 'SELECT * FROM token where Codigo=? AND Token=?;'
                connection.query(query, [Codigo = data.Codigo, Token = data.Token], (error, results) => {
                    if (error) {
                        console.error('Erro ao consultar dados:', error);
                        connection.release();
                        return;
                    }

                    if (results.length === 0) {

                        if (data.Token !== undefined && data.Token !== '') {

                            connection.query('INSERT INTO token (Codigo, Token) VALUE("' + data.Codigo + '", "' + data.Token + '")', (error2, results2) => {
                                if (error2) {
                                    console.error('Erro ao consultar dados:', error2);
                                    connection.release();
                                    return;
                                }

                            })
                            connection.release();
                        }
                    } else {
                        connection.release();
                    }

                })
            } catch (erro) {
                console.log(erro)
                connection.release();
            }
        })

    }

}

async function handlerUltimaEntrada(data, Socket) {

    if (Descriptografar(data.Code) !== '489498498498') return

    try {
        const connection = await pool.getConnection()
        const querySaida = 'SELECT Horas FROM entrada where Codigo=? AND Dia=?;';
        const ValorSaida = [Descriptografar(data.Codigo), getData()];
        const [Resultado] = await connection.query(querySaida, ValorSaida);

        if (Resultado.length > 0) {
            Socket.emit(`ResponseUltimaEntrada${Descriptografar(data.Codigo)}`, {
                Code: Criptografar('489498498498'),
                Dados: Criptografar(Resultado[Resultado.length - 1].Horas)
            })
        } else {
            Socket.emit(`ResponseUltimaEntrada${Descriptografar(data.Codigo)}`, {
                Code: Criptografar('489498498498'),
                Dados: Criptografar('-- : -- : --')
            })
        }
        connection.release()
    } catch (error) {
        console.error('Erro ao consultar dados:', error);
    }
}

async function handlerUltimaSaida(data, Socket) {


    if (Descriptografar(data.Code) !== '98749651321321321') {
        return
    }

    try {
        const connection = await pool.getConnection()
        const querySaida = 'SELECT * FROM saida where Codigo=? AND Dia=?;';
        const ValorSaida = [Descriptografar(data.Codigo), getData()];
        const [Resultado] = await connection.query(querySaida, ValorSaida);

        if (Resultado.length > 0) {
            Socket.emit(`ResponseUltimaSaida${Descriptografar(data.Codigo)}`, {
                Code: Criptografar('98749651321321321'),
                Dados: Criptografar(Resultado[Resultado.length - 1].Horas)
            })
        } else {
            Socket.emit(`ResponseUltimaSaida${Descriptografar(data.Codigo)}`, {
                Code: Criptografar('98749651321321321'),
                Dados: Criptografar('-- : -- : --')
            })
        }
        connection.release()
    } catch (error) {
        console.error('Erro ao consultar dados:', error);
    }
}


// SITE


async function handlerValidar(data, Socket) {

    if (Descriptografar(data.Code) !== '1651653203') return

    try {

        const connection = await pool.getConnection();
        const ValidarQuery = 'SELECT * FROM cadastro where Codigo=?;';
        const ValorValidar = [Descriptografar(data.Codigo).substring(1)];
        const [ResultadoValidar] = await connection.query(ValidarQuery, ValorValidar);

        if (ResultadoValidar.length > 0) {

            if (ResultadoValidar[0].Senha === 'e73d9330d802247ffdbf57bbf707b746d4c1c8c4') {
                const QueryUpdate = 'UPDATE cadastro SET Senha=? , Carteirinha=?  WHERE Codigo=?';
                const ValorUpdate = [Descriptografar(data.Codigo).substring(1), Descriptografar(data.Data), Descriptografar(data.Codigo).substring(1)]
                await connection.query(QueryUpdate, ValorUpdate);


                Socket.emit('CarteirinhaAtualizada', {
                    Code: Criptografar('98798456132'),
                    Ativador: Criptografar(true)
                })

            } else {
                Socket.emit('CarteirinhaJaValidada', {
                    Code: Criptografar('65486749848965')
                })
            }
        } else {
            Socket.emit('AlunoNaoEncontrado', {
                Code: Criptografar('5456456465654'),
                Ativador: Criptografar(false)
            })
        }

        connection.release();

    } catch (error) {
        console.error(`Erro encontrado bloco 01 handlerValidar: ${error}`)
        Socket.emit('AlunoNaoEncontrado', {
            Code: Criptografar('5456456465654'),
            Ativador: Criptografar(false)
        })
    }
}

async function handlerRegistroEscola(data, socket) {

    if (Descriptografar(data.Code) !== '968545616547') return

    var contador = 0;
    const Identification = Descriptografar(data.Identification)

    socket.emit(`CriarDados${Identification}`, {
        Code: Criptografar('9956546546521'),
        Status: Criptografar('202')

    })

    const teste = Descriptografar(data.Alunos)
    const connection = await pool.getConnection();
    try {

        const QueryDelete = "DELETE FROM cadastro WHERE Escola=?;"
        const ValorDelete = [Descriptografar(data.Escola)];
        await connection.query(QueryDelete, ValorDelete);
    } catch (Error) {
        console.error(`Erro Encontrado no bloco 01 handlerRegistroEscola: ${Error} `)
    }

    try {
        const QueryAlunos = 'SELECT * FROM cadastro where Escola=?;';
        const ValorAlunos = [Descriptografar(data.Escola)];
        const [ResultadoAlunos] = await connection.query(QueryAlunos, ValorAlunos);

        if (ResultadoAlunos.length > 0) return

        const QueryAlunosV = 'SELECT Codigo FROM cadastro';
        const [ResultadoAlunosV] = await connection.query(QueryAlunosV);


        for (let i = 0; i < teste.length; i++) {

            if (ResultadoAlunosV.find((e) => e.Codigo === teste[i].Codigo) !== undefined) {

                console.log(`Aluno Duplicado encontrado, mudança feita`)

                const QueryDelete = "DELETE FROM cadastro WHERE Codigo=?;"
                const ValorDelete = [teste[i].Codigo];
                await connection.query(QueryDelete, ValorDelete);

            } else {
                contador += 1

                socket.emit(`Contador${Identification}`, {
                    Code: Criptografar('65435436554'),
                    contador: Criptografar(contador)
                })

                console.log(`Aluno ${teste[i].Aluno} inserido com Sucesso totalizando ${contador}`)
                const QueryInsert = "INSERT INTO cadastro (Codigo, Senha, Autorization, Aluno, Escola, Modalidade, Data, Turma, `Ano-Serie`, Turno, Sexo, Ano, Atrasos, Entradas, Carteirinha) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);"
                const ValorInsert = [teste[i].Codigo, teste[i].Senha, teste[i].Autorization, teste[i].Aluno, teste[i].Escola, teste[i].Modalidade, teste[i].Data, teste[i].Turma, teste[i].AnoSerie, teste[i].Turno, teste[i].Sexo, teste[i].Ano, teste[i].Atrasos, teste[i].Entradas, '2024-01-01']
                await connection.query(QueryInsert, ValorInsert);

            }
        }
        socket.emit(`Finalizar${Identification}`, {
            Code: Criptografar('984854153165'),
            Status: Criptografar('201')
        })

        connection.release()
    } catch (Error) {
        console.error(`Erro Encontrado no bloco 02 handlerRegistroEscola: ${Error} `)
    }

}

async function EnviarNotificaEntrada(expoPushToken, aluno, Horas) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: 'Entrada',
        body: "O Aluno " + aluno + " entrou na escola as " + Horas + "",

    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}

async function EnviarNotificaSaida(expoPushToken, aluno, Horas) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: 'Entrada',
        body: "O Aluno " + aluno + " saiu da escola as " + Horas + "",

    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}



setInterval(async () => { // Saida Matutino

    CriarImagem()
    //restartServer()

}, 1000)


async function CriarImagem() {

    var today = new Date()
    const dayName = new Array("domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado")

    var HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));

    if (dayName[today.getDay()] !== "sábado" && dayName[today.getDay()] !== "domingo") {

        if (HoraAtual !== '22:00:00') return

        const connection = new Database();
        const TotalQuery = 'SELECT * FROM cadastro'
        const resultado = await connection.query(TotalQuery)


        for (let i = 0; i < resultado.length; i++) {

            const imagePath = path.join(__dirname, `/Fotos/${resultado[i].Codigo}.JPG`);

            fs.readFile(imagePath, (error, data) => {
                if (error) {

                    console.log(`Erro ao ler a imagem: ${resultado[i].Codigo}`);

                } else {

                    const base64Image = Buffer.from(data).toString('base64');

                    const buffer = Buffer.from(base64Image, 'base64');

                    // Comprime a imagem usando sharp
                    sharp(buffer)
                        .resize(200) // Redimensiona a imagem para uma largura máxima de 800 pixels (opcional)
                        .toBuffer()
                        .then(async (buffer) => {
                            // Converte o buffer para base64
                            const compressedBase64Image = buffer.toString('base64');

                            // Faça algo com a imagem comprimida em base64, como salvá-la no banco de dados ou enviá-la para outro lugar
                            console.log(`Imagem ${resultado[i].Codigo} Criada com sucesso`);


                            const valor = [compressedBase64Image, resultado[i].Codigo]
                            const query = 'UPDATE cadastro SET Imagem=? WHERE Codigo=?'
                            await connection.query(query, valor)
                        })
                }
            });
        }

        console.log('Finalizado')
        
    }
}

// Função para reiniciar o servidor
function restartServer() {

    var today = new Date()
    const dayName = new Array("domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado")

    var HoraAtual = (((today.getHours() + 4) < 10 ? ("0" + (today.getHours() + 4)) : (today.getHours() + 4)) + ":" + (today.getMinutes() < 10 ? ("0" + today.getMinutes()) : today.getMinutes()) + ":" + (today.getSeconds() < 10 ? ("0" + today.getSeconds()) : today.getSeconds()));
    var DataAtual = (today.getFullYear() + "-" + monName[today.getMonth()] + "-" + today.getDate());

    if (dayName[today.getDay()] !== "sábado" && dayName[today.getDay()] !== "domingo") {

        if (HoraAtual === '06:00:00' || HoraAtual === '12:00:00' || HoraAtual === '21:00:00') {
            console.log('--------------------------------------------');
            console.log('');
            console.log('Reiniciando Servidor...');
            console.log('');
            console.log('--------------------------------------------');
            setTimeout(() => {
                Servidor.listen(3001, () => {
                    console.log('--------------------------------------------');
                    console.log('');
                    console.log("Servidor com a Porta 3001 em Execução")
                    console.log('');
                    console.log('--------------------------------------------');
                });
            }, 5000);
            Servidor.close();
        }

    }
}
