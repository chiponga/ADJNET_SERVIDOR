
const moment = require('moment-timezone');

async function Data() {
    // Defina o fuso horário desejado
    const timezone = 'America/Sao_Paulo';

    // Obtenha a data e hora atual no fuso horário correto
    const now = moment().tz(timezone);

    // Formate a data no formato desejado (YYYY-MM-DD)
    const Data = now.format('YYYY-MM-DD');

    return Data;
}

async function DataBrasil() {
    // Defina o fuso horário desejado
    const timezone = 'America/Sao_Paulo';

    // Obtenha a data e hora atual no fuso horário correto
    const now = moment().tz(timezone);

    // Formate a data no formato desejado (YYYY-MM-DD)
    const Data = now.format('DD/MM/YYYY');

    return Data;
}

async function Ano() {
    // Defina o fuso horário desejado
    const timezone = 'America/Sao_Paulo';

    // Obtenha a data e hora atual no fuso horário correto
    const now = moment().tz(timezone);

    // Formate a data no formato desejado (YYYY-MM-DD)
    const Data = now.format('YYYY');

    return Data;
}



module.exports = {Data , DataBrasil, Ano};