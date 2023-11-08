const mySqlDatabase = include('databaseConnectionSQL');

async function searchPost(data) {
    try {
        let searchWordSQL = `
        SELECT * 
        FROM ( 
        SELECT name, text_info_id, title, text, MATCH(text) AGAINST (?) as word_appearance, u.user_id
        FROM text_info_dbp2 as t 
        left join (
        select ancestor, descendant, path_length
        from ClosureTable
        ) as c
        on t.text_info_id = c.ancestor
        left join user as u
        on t.user_id = u.user_id
        WHERE c.ancestor is NOT NULL AND c.descendant IS NOT NULL AND path_length IS NOT NULL ) AS subquery
        HAVING word_appearance > 0 
        ORDER BY word_appearance DESC;
        `
        let [result] = await mySqlDatabase.query(searchWordSQL, [data.word])       
        return result; 
    } catch (err) {
        console.log(err);
        return false 
    }
}

module.exports = {searchPost}