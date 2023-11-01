const mySqlDatabase = include('databaseConnectionSQL');

async function getRootMessages(data) {
  try {
    let insertSQL = `SELECT * 
FROM text_info_dbp2 as t 
left join (
	select ancestor, max(descendant),path_length
    from ClosureTable
    group by ancestor
) as c
on t.text_info_id = c.ancestor
where path_length = 0`
    let responseData = await mySqlDatabase.query(insertSQL);
    console.log(`Successfully retrieve root messages`)
    return responseData;
  } catch (err) {
    console.log("Error for retrieving root messages :" + err);
    return err;

  }
}



module.exports = { getRootMessages }


