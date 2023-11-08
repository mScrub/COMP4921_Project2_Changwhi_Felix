const mySqlDatabase = include('databaseConnectionSQL');

async function searchPost(data) {
    try {
        let searchWordSQL = `
        SELECT title, score, text
        FROM (
          SELECT title, MATCH(text) AGAINST (?) as score, text
          FROM text_info_dbp2
        ) AS subquery
        WHERE score > 0 
        ORDER BY score desc;
        `
        let [result] = await mySqlDatabase.query(searchWordSQL, [data.word])       
        return result; 
    } catch (err) {
        console.log(err);
        return false 
    }
}

module.exports = {searchPost}