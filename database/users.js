const mySqlDatabase = include('databaseConnectionSQL');

async function createUser(postData) {
  let createUserSQL = `
    INSERT INTO user (email, hashed_password, name, user_type_id)
    VALUES (:email, :passwordHash, :name,
        (SELECT user_type_id
         FROM user_type
         WHERE user_type = "user"));
	`;

  let params = {
    email: postData.email,
    passwordHash: postData.hashedPassword,
    name: postData.name
  }

	try {
		const results = await mySqlDatabase.query(createUserSQL, params);
        console.log("Successfully created user");
		return true;
	}
	catch(err) {
        console.log("Error inserting user");
        console.log(err);
		return false;
	}
}

async function getUsers() {
	let getUsersSQL = `
		SELECT hashed_password, email, user_id, user_type_id, name
		FROM user;
	`;

  try {
    const results = await mySqlDatabase.query(getUsersSQL);
    // console.log(results[0]);
    return results[0];
  }
  catch (err) {
    console.log("Error getting users");
    console.log(err);
    return false;
  }
}



module.exports = { createUser, getUsers };
