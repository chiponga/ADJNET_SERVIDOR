
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
const PORT = process.env.PORT || 3001;

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

            this.keepAliveInterval = 60000; // Intervalo de 60 segundos para o keep-alive
            this.startKeepAlive();

            Database.instance = this;
        }
        return Database.instance;
    }

    async query(sql, values = []) {
        let connection;
        try {
            connection = await this.pool.getConnection();
            const [rows, fields] = await connection.query(sql, values);
            return rows;
        } catch (error) {
            console.error('Erro na consulta:', error);
            if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
                // Tentativa de reconectar se a conexão foi perdida
                connection = await this.pool.getConnection();
                const [rows, fields] = await connection.query(sql, values);
                return rows;
            }
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    startKeepAlive() {
        setInterval(async () => {
            try {
                const connection = await this.pool.getConnection();
                await connection.ping();
                connection.release();
            } catch (err) {
                console.error('Keep-alive error:', err);
            }
        }, this.keepAliveInterval);
    }
}


var conexoes = []

const Cliente_Site = {
    Cliente: {}
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
            const QueryLogin = 'SELECT * FROM user where Login=? AND Senha=?;';
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

    async handlerRegistroToken() {

        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Codigo = JSON.parse(Descriptografar(this.data.Codigo))
        const Token = JSON.parse(Descriptografar(this.data.Token))

        if (Code !== '5475656746565821653791789321789') return

        try {
            const query = 'SELECT * FROM token where Codigo=? AND Token=?;'
            const valores = [Codigo, Token]
            const resultados = await this.db.query(query, valores)

            if (resultados.length > 0) {

                if (this.data.Token !== undefined && this.data.Token !== '') {

                    const query = 'INSERT INTO token (Codigo, Token) VALUES(?,?)'
                    const valores = [Codigo, Token]
                    await this.db.query(query, valores);

                    this.socket.emit('ResponseCriarToken', {
                        Code: Criptografar(JSON.stringify('44655441676554876889787')),
                        Response: Criptografar(JSON.stringify(true))
                    })
                }
            }
        } catch (erro) {
            console.log(erro)
        }
    }

    async handlerUltimaEntrada() {

        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Codigo = JSON.parse(Descriptografar(this.data.Codigo))
        const Escola = JSON.parse(Descriptografar(this.data.Escola))


        if (Code !== '489498498498') return

        try {
            const querySaida = 'SELECT Horas FROM entrada where Codigo=? AND Dia=? AND Escola=?;';
            const ValorSaida = [Codigo, getData(), Escola];
            const Resultado = await this.db.query(querySaida, ValorSaida);

            if (Resultado.length > 0) {
                this.socket.emit(`ResponseUltimaEntrada`, {
                    Code: Criptografar('489498498498'),
                    Dados: Criptografar(Resultado[Resultado.length - 1].Horas)
                })
            } else {
                this.socket.emit(`ResponseUltimaEntrada`, {
                    Code: Criptografar('489498498498'),
                    Dados: Criptografar('-- : -- : --')
                })
            }
        } catch (error) {
            console.error('Erro ao consultar dados:', error);
        }
    }

    async handlerUltimaSaida() {

        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Codigo = JSON.parse(Descriptografar(this.data.Codigo))
        const Escola = JSON.parse(Descriptografar(this.data.Escola))

        if (Code !== '98749651321321321') return

        try {
            const querySaida = 'SELECT Horas FROM saida where Codigo=? AND Dia=? AND Escola=?;';
            const ValorSaida = [Codigo, getData(), Escola];
            const Resultado = await this.db.query(querySaida, ValorSaida);

            if (Resultado.length > 0) {
                this.socket.emit(`ResponseUltimaSaida`, {
                    Code: Criptografar('98749651321321321'),
                    Dados: Criptografar(Resultado[Resultado.length - 1].Horas)
                })
            } else {
                this.socket.emit(`ResponseUltimaSaida`, {
                    Code: Criptografar('98749651321321321'),
                    Dados: Criptografar('-- : -- : --')
                })
            }
        } catch (error) {
            console.error('Erro ao consultar dados:', error);
        }
    }

    async handlerRegistrosAvisos() {


        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Escola = JSON.parse(Descriptografar(this.data.Escola))

        if (Code === '2434646554568775') {

            try {

                const QueryAvisos = 'SELECT * FROM avisos WHERE Escola=?;';
                const ValorAvisos = [Escola];
                const ResultadoAvisos = await this.db.query(QueryAvisos, ValorAvisos);

                if (ResultadoAvisos.length > 0) {
                    this.socket.emit(`ResponseAvisos`, {
                        Code: Criptografar('989789567756897'),
                        Data: Criptografar(ResultadoAvisos)
                    })
                } else {
                    this.socket.emit(`ResponseAvisos`, {
                        Code: Criptografar('989789567756897'),
                        Data: Criptografar([])
                    })
                }

            } catch (error) {
                console.error('Erro ao consultar dados:', error);
            }
        }
    }

    async handlerRegistrosRegistro() {

        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Escola = JSON.parse(Descriptografar(this.data.Escola))
        const Turma = JSON.parse(Descriptografar(this.data.Turma))
        const Codigo = JSON.parse(Descriptografar(this.data.Codigo))


        if (Code === '23544236544235464') {


            try {

                const QueryRegistro = 'select * from registro where Escola=? and Turma=? or Escola=? and Codigo=?';
                const ValorRegistro = [Escola, Turma, Escola, Codigo];
                const ResultadoRegistro = await this.db.query(QueryRegistro, ValorRegistro);

                if (ResultadoRegistro.length > 0) {
                    this.socket.emit(`ResponseRegistros`, {
                        Code: Criptografar('9854854651651'),
                        Data: Criptografar(ResultadoRegistro)
                    })
                } else {
                    this.socket.emit(`ResponseRegistros`, {
                        Code: Criptografar('9854854651651'),
                        Data: Criptografar([])
                    })
                }

            } catch (error) {
                console.error('Erro ao consultar dados:', error);

            }
        }
    }

    async handlerRegistroAluno() {

        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Codigo = JSON.parse(Descriptografar(this.data.Codigo))
        const Senha = JSON.parse(Descriptografar(this.data.Senha))

        if (Code !== '3554365456765618372913') return

        try {

            const QueryRegistro = 'SELECT * FROM cadastro WHERE Codigo=? and Senha=?';
            const ValorRegistro = [Codigo, Senha];
            const ResultadoRegistro = await this.db.query(QueryRegistro, ValorRegistro);

            if (ResultadoRegistro.length > 0) {
                this.socket.emit('ResponseRegistrarAluno', {
                    Code: Criptografar(JSON.stringify('655644331453261456654')),
                    result: Criptografar(JSON.stringify(ResultadoRegistro))
                })
            } else {
                this.socket.emit('ResponseRegistrarAluno', {
                    Code: Criptografar(JSON.stringify('655644331453261456654')),
                    result: Criptografar(JSON.stringify(0))
                })
            }


        } catch (error) {
            console.error(error)
        }


    }

    async handlerReceberNotas() {

        const Code = JSON.parse(Descriptografar(this.data.Code))
        const Codigo = JSON.parse(Descriptografar(this.data.Codigo))

        if (Code !== '35442635442365442346') return

        try {

            const QueryRegistro = 'SELECT * FROM notas WHERE Codigo=?';
            const ValorRegistro = [Codigo];
            const ResultadoRegistro = await this.db.query(QueryRegistro, ValorRegistro);

            if (ResultadoRegistro.length > 0) {
                this.socket.emit('ResponseReceberNotas', {
                    Code: Criptografar(JSON.stringify('655644331453261456654')),
                    result: Criptografar(JSON.stringify(ResultadoRegistro))
                })
            } else {
                this.socket.emit('ResponseReceberNotas', {
                    Code: Criptografar(JSON.stringify('655644331453261456654')),
                    result: Criptografar(JSON.stringify(0))
                })
            }

        } catch (error) {
            console.error(error)
        }
    }

    async handlerRegistroEscola() {

        if (Descriptografar(this.data.Code) !== '968545616547') return
        var Salvar = []
        var contador = 0;
        const Identification = Descriptografar(this.data.Identification)
    
        socket.emit(`CriarDados${Identification}`, {
            Code: Criptografar('9956546546521'),
            Status: Criptografar('202')
    
        })
    
        const teste = Descriptografar(this.data.Alunos)
      
        const QueryAlunos = 'SELECT * FROM cadastro where Escola=?;';
        const ValorAlunos = [Descriptografar(this.data.Escola)];
        const ResultadoAlunos = await this.db.query(QueryAlunos, ValorAlunos);
    
        if (ResultadoAlunos.length > 0) {
    
           const lista =  ResultadoAlunos.map((item) => {
    
                if (item.Senha != 'e73d9330d802247ffdbf57bbf707b746d4c1c8c4') {
    
                    Salvar.push({
                        Codigo: item.Codigo,
                        Senha: item.Senha,
                        Autorization: item.Autorization,
                        Aluno: item.Aluno,
                        Escola: item.Escola,
                        Modalidade: item.Modalidade,
                        Data: item.Data,
                        Turma: item.Turma,
                        AnoSerie: item.AnoSerie,
                        Turno: item.Turno,
                        Sexo: item.Sexo,
                        Ano: item.Ano,
                        Atrasos: item.Atrasos,
                        Entradas: item.Entradas,
                        Carteirinha: item.Carteirinha,
                        Imagem: item.Imagem
                    })
                }
            })
    
        }
    
    
        try {
    
            const QueryDelete = "DELETE FROM cadastro WHERE Escola=?;"
            const ValorDelete = [Descriptografar(this.data.Escola)];
            await this.db.query(QueryDelete, ValorDelete);

        } catch (Error) {
            console.error(`Erro Encontrado no bloco 01 handlerRegistroEscola: ${Error} `)
        }
    
        try {
            const QueryAlunos = 'SELECT * FROM cadastro where Escola=?;';
            const ValorAlunos = [Descriptografar(this.data.Escola)];
            const ResultadoAlunos = await this.db.query(QueryAlunos, ValorAlunos);
    
            if (ResultadoAlunos.length > 0) return
    
            const QueryAlunosV = 'SELECT Codigo FROM cadastro';
            const ResultadoAlunosV = await this.db.query(QueryAlunosV);
    
    
            for (let i = 0; i < teste.length; i++) {
    
                if (ResultadoAlunosV.find((e) => e.Codigo === teste[i].Codigo) !== undefined) {
    
                    console.log(`Aluno Duplicado encontrado, mudança feita`)
    
                    const QueryDelete = "DELETE FROM cadastro WHERE Codigo=?;"
                    const ValorDelete = [teste[i].Codigo];
                    await this.db.query(QueryDelete, ValorDelete);
    
                } else {
    
                    Salvar.map(async (item) => {
                        if (teste.find((e) => e.Codigo === item.Codigo) !== undefined) {
    
                            contador += 1
    
                            socket.emit(`Contador${Identification}`, {
                                Code: Criptografar('65435436554'),
                                contador: Criptografar(contador)
                            })
    
    
                            console.log(`Aluno ${teste[i].Aluno} inserido com Sucesso totalizando ${contador}`)
                            const QueryInsert = "INSERT INTO cadastro (Codigo, Senha, Autorization, Aluno, Escola, Modalidade, Data, Turma, `Ano-Serie`, Turno, Sexo, Ano, Atrasos, Entradas, Carteirinha, Imagem) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);"
                            const ValorInsert = [teste[i].Codigo, item.Senha, teste[i].Autorization, teste[i].Aluno, teste[i].Escola, teste[i].Modalidade, teste[i].Data, teste[i].Turma, teste[i].AnoSerie, teste[i].Turno, teste[i].Sexo, teste[i].Ano, teste[i].Atrasos, teste[i].Entradas, item.Carteirinha, item.Imagem]
                            await this.db.query(QueryInsert, ValorInsert);
    
                        } else {
                            contador += 1
    
                            socket.emit(`Contador${Identification}`, {
                                Code: Criptografar('65435436554'),
                                contador: Criptografar(contador)
                            })
    
    
    
                            console.log(`Aluno ${teste[i].Aluno} inserido com Sucesso totalizando ${contador}`)
                            const QueryInsert = "INSERT INTO cadastro (Codigo, Senha, Autorization, Aluno, Escola, Modalidade, Data, Turma, `Ano-Serie`, Turno, Sexo, Ano, Atrasos, Entradas, Carteirinha) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);"
                            const ValorInsert = [teste[i].Codigo, teste[i].Senha, teste[i].Autorization, teste[i].Aluno, teste[i].Escola, teste[i].Modalidade, teste[i].Data, teste[i].Turma, teste[i].AnoSerie, teste[i].Turno, teste[i].Sexo, teste[i].Ano, teste[i].Atrasos, teste[i].Entradas, '2025-03-30']
                            await this.db.query(QueryInsert, ValorInsert);
                        }
                    })
                }
            }
            socket.emit(`Finalizar${Identification}`, {
                Code: Criptografar('984854153165'),
                Status: Criptografar('201')
            })
    
        } catch (Error) {
            console.error(`Erro Encontrado no bloco 02 handlerRegistroEscola: ${Error} `)
        }
    
    }

}


socket.on('connection', (Socket) => {

    // site

    Socket.on('EntradaRequest', (data) => new NovaEscola(data, Socket).handlerEntradaRequest())

    Socket.on('SaidaRequest', (data) => new NovaEscola(data, Socket).handlerSaidaRequest())

    Socket.on('Login', (data) => new NovaEscola(data, Socket).handlerLogin());

    Socket.on('RegistrarEscola', (data) => new NovaEscola(data,Socket).handlerRegistroEscola());

    Socket.on('Validar', (data) => handlerValidar(data, Socket));

    // aplicativo

    Socket.on('UltimaEntrada', (data) => new NovaEscola(data, Socket).handlerUltimaEntrada());

    Socket.on('UltimaSaida', (data) => new NovaEscola(data, Socket).handlerUltimaSaida());

    Socket.on('RegistroToken', (data) => new NovaEscola(data, Socket).handlerRegistroToken());

    Socket.on('RegistrosAvisos', (data) => new NovaEscola(data, Socket).handlerRegistrosAvisos());

    Socket.on('RegistrosRegistro', (data) => new NovaEscola(data, Socket).handlerRegistrosRegistro());

    Socket.on('RegistrarAluno', (data) => new NovaEscola(data, Socket).handlerRegistroAluno())

    Socket.on('ReceberNotas', (data) => new NovaEscola(data, Socket).handlerReceberNotas())

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

});



Servidor.listen(PORT, () => {
    console.log(`Servidor com a Porta ${PORT} em Execução`)
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




