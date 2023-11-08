const mySqlDatabase = include('databaseConnectionSQL');

async function insertImage(data) {
  try {
    // let dateSQL = `select curdate()`
    // let date = await mySqlDatabase.query(dateSQL)
    // console.log(date)
    let insertImageSQL = `
      UPDATE picture_info
      SET link = :link, public_id = :public_id
      WHERE picture_UUID = :picture_UUID;
    `;

    let params = {
      link: data.link,
      // created: date[0][0]['curdate()'],
      public_id: data.public_id,
      picture_UUID: data.picture_UUID,
    }


    await mySqlDatabase.query(insertImageSQL, params);
    console.log("Successfully created image");
    return true;
  } catch (err) {
    console.log("Error inserting image");
    console.log(err);
    return false;
  }
}

async function addColumn(data) {
  try {
    // let dateSQL = `select curdate()`
    // let date = await mySqlDatabase.query(dateSQL)
    let uuidSQL = `select uuidGenerator()`;
    let uuid = await mySqlDatabase.query(uuidSQL);
    console.log(uuid[0][0]['uuidGenerator()'])

    let insertImageSQL = `
    INSERT INTO picture_info(name, picture_UUID, user_id, comment)
    VALUES (:name,:picture_UUID,:user_id, NULL);
	`;

    let params = {
      name: data.name,
      user_id: data.user_id,
      // comment: data.comment,
      picture_UUID: uuid[0][0]['uuidGenerator()'],
    }

    await mySqlDatabase.query(insertImageSQL, params);
    console.log("Successfully created column");
    return true;
  } catch (err) {
    console.log("Error adding column");
    console.log(err);
    return false;
  }

}

async function getColumn(data) {
  try {
    // let dateSQL = `select curdate()`
    // let date = await mySqlDatabase.query(dateSQL)
    let insertImageSQL = `
    SELECT * from picture_info where user_id = ?`;
    let params = [data.user_id]
    let responseData = await mySqlDatabase.query(insertImageSQL, params);
    console.log("Successfully retrieved column");
    return responseData;
  } catch (err) {
    console.log("Error retrieving column");
    console.log(err);
    return false;
  }
}

async function getImage(data) {
  try {
    let insertImageSQL = `
    SELECT * from picture_info where picture_UUID= ?`;
    let params = [data.picture_UUID]
    let responseData = await mySqlDatabase.query(insertImageSQL, params);
    console.log("Successfully retrieved column");
    return responseData;
  } catch (err) {
    console.log("Error retrieving column");
    console.log(err);
    return false;
  }
}

async function deleteImage(data) {
  try {
    let deleteImageSQL = `
      DELETE FROM picture_info
      WHERE picture_UUID = ?;
    `;
    let params = [data.picture_UUID];
    await mySqlDatabase.query(deleteImageSQL, params);
    console.log("Successfully deleted image");
    return true;
  } catch (err) {
    console.log("Error deleting image");
    console.log(err);
    return false;
  }
}

async function createRootLinkClosure(data) {
  try {
    let createRootLinkClosureSQL = `
    INSERT INTO ClosureTable (ancestor, descendant, path_length)
    VALUES (:text_info_id, :text_info_id, 0)`
    let params = {
      text_info_id : data.text_info_id
    }
    await mySqlDatabase.query(createRootLinkClosureSQL, params)
    return true;
  } catch (err) {
    return false
  }
}

async function getOwnRootText(data) {
  try {
    let getOwnRootTextSQL = `SELECT * 
    FROM text_info_dbp2 as t 
    left join (
	  select ancestor, max(descendant),path_length
    from ClosureTable
    group by ancestor
    ) as c
    on t.text_info_id = c.ancestor
    left join user as u
    on t.user_id = u.user_id
    where t.user_id = ? and c.path_length = 0`
    let params = [data.user_id]
    let responseData = await mySqlDatabase.query(getOwnRootTextSQL, params);
    console.log(`Successfully retrieve own messages`)
    return responseData;
  } catch (err) {
    console.log("Error for retrieving own messages :" + err);
    return err;

  }
}


async function getTextInfoID(data) {
  try {
    let getTextInfoIDSQL = `
    SELECT text_info_id
    FROM text_info_dbp2
    WHERE user_id = ?
    ORDER BY text_info_id DESC
    LIMIT 1; `

    let params = [data.user_id]
    const [textInfoID]= await mySqlDatabase.query(getTextInfoIDSQL, params)
    if (textInfoID && textInfoID.length > 0) {
      console.log("Successfully obtained text/post id")
      return textInfoID[0].text_info_id;
    } else {
      console.log("No text/post id found")
      return null;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function doesTextExist(data) {
  try {
    const checkTextSQL = `
      SELECT COUNT(*) AS textCount
      FROM text_info_dbp2
      WHERE title = :title AND user_id = :user_id
    `;

    const params = {
      title: data.title,
      user_id: data.user_id,
    };
    const [result] = await mySqlDatabase.query(checkTextSQL, params);
    return result[0].textCount > 0;
  } catch (err) {
    console.error('Failed to check if the text/post exists');
    console.error(err);
    return false;
  }
}


async function createTextPost(data) {
  try {
    let createTextPostSQL = `
    INSERT INTO text_info_dbp2 (title, text, likes, user_id, created)
    VALUES (:title, :text, DEFAULT, :user_id, DATE(NOW()))`

    let params = {
      user_id: data.user_id,
      title: data.title,
      text: data.content
    }
    await mySqlDatabase.query(createTextPostSQL, params)
    console.log("Post/Text p1 created successfully")
    return true;

  } catch (err) {
    console.log("Failed p1 to created")
    console.log(err);
    return false;
  }
}


module.exports = {
  insertImage,
  getImage,
  addColumn,
  getColumn,
  deleteImage,
  createTextPost,
  doesTextExist,
  getTextInfoID,
  createRootLinkClosure,
  getOwnRootText,
}