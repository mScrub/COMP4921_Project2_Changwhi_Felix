const mySqlDatabase = include('databaseConnectionSQL');

async function getRootMessages() {
  try {
    let insertSQL = `SELECT * 
FROM text_info_dbp2 as t 
left join (
	select ancestor, max(descendant),path_length
    from ClosureTable
    group by ancestor
) as c
on t.text_info_id = c.ancestor
left join user as u
on t.user_id = u.user_id
where path_length = 0`
    let responseData = await mySqlDatabase.query(insertSQL);
    console.log(`Successfully retrieve root messages`)
    return responseData;
  } catch (err) {
    console.log("Error for retrieving root messages :" + err);
    return err;

  }
}

async function getMessageWithChilds(ancestorId) {
  try {
    let insertSQL = `
select *
from text_info_dbp2 as t_p
join ClosureTable as c_p
on t_p.text_info_id = c_p.descendant
join (select descendant as "descendant2"
from text_info_dbp2 as t
join ClosureTable as c
on t.text_info_id = c.descendant
where c.ancestor = ?) as innerQuery
on c_p.descendant = innerQuery.descendant2
join (
	select ancestor as "duplicatedColumn", path_length as "ancestor_path_length"
    from ClosureTable as ct
    where ct.ancestor = ct.descendant
) as cpl
on  cpl.duplicatedColumn = c_p.ancestor
join user
on t_p.user_id = user.user_id;
`
    const responseData = await mySqlDatabase.query(insertSQL, [ancestorId]);
    console.log(`Successfully retrieve Thread with messages : ` + responseData)
    return responseData;
  } catch (err) {
    console.log("Error for retrieving Thread with messages :" + err);
    return err;

  }
}

async function addMessage(data) {
  try {
    let insertSQL = `
        insert into text_info_dbp2 (title, text, likes, user_id)
        values (:title, :text, :likes, :user_id)
`

    let params = {
      title: data.title,
      text: data.text,
      likes: 0,
      user_id: data.user_id

    }
    const response = await mySqlDatabase.query(insertSQL, params)
    console.log("Successfully added new message   :" + response)
    return response


  } catch (err) {
    console.log("Error for adding messages :" + err);
    return err;
  }
}

async function addClosureTable(data) {
  try {
    let insertSQL = `
      INSERT INTO ClosureTable (ancestor, descendant, path_length)
      SELECT c.ancestor, :message_id, :path_length
      FROM ClosureTable AS c
      WHERE c.descendant = :current_parent_id
      UNION ALL
      SELECT :message_id, :message_id, :path_length;
    `;

    let params = {
      message_id: data.message_id,
      current_parent_id: data.current_parent_id,
      path_length: data.path_length,
    };

    const response = await mySqlDatabase.query(insertSQL, params);
    console.log("Successfully added new node:", JSON.stringify(response));
    return response;
  } catch (err) {
    console.log("Error for adding new node:", err);
    return err;
  }
}


async function getTop3Message() {
  try {
    let insertSQL = `SELECT * FROM text_info_dbp2 as t
join ClosureTable as c
on t.text_info_id = c.descendant
where c.ancestor = c.descendant
and c.path_length = 0
order by likes desc
limit 3;`

    const response = await mySqlDatabase.query(insertSQL);
    console.log("Successfully retrieve top 3 messages")
    return response;
  } catch (err) {
    console.log("Error for retrieving top 3  messages" + err)
    return err
  }
}

async function removeMessage(data) {
  try {
    let insertSQL = `
update text_info_dbp2
set text = "[No message : This message has been deleted 😭]"
where text_info_id = ?;

`
    const response = await mySqlDatabase.query(insertSQL, [data.text_id]);
    console.log("Successfully remove messages")
    return response;
  } catch (err) {
    console.log("Error for removing messages" + err)
    return false;
  }
}

async function removeThread(data) {
  try {
    let insertSQL = `
DELETE FROM ClosureTable
WHERE ancestor = ?
`
    const response = await mySqlDatabase.query(insertSQL, [data.text_id]);
    console.log("Successfully remove thread in ClosureTable :" + JSON.stringify(response))
    console.log("We will delete removed threads and comments after 2month later")
    return true;
  } catch (err) {
    console.log("Error for removing thread" + err)
    return false;
  }
}

async function incrementLikes(data) {
  try {
    let insertSQL = `
update text_info_dbp2
set likes = likes + 1
where text_info_id = ?;

`
    const response = await mySqlDatabase.query(insertSQL, [data.text_id]);
    console.log("Successfully increament likes")
    return response;
  } catch (err) {
    console.log("Error for increment likes" + err)
    return false;
  }
}


module.exports = { incrementLikes, removeThread, removeMessage, getRootMessages, getMessageWithChilds, addMessage, addClosureTable, getTop3Message }


