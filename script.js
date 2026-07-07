function generateID(){
    return Math.random()
    .toString(36)
    .substring(2,8)
    .toUpperCase();
}


function createProfile(){

    let username =
    document.getElementById("username").value;

    let bio =
    document.getElementById("bio").value;


    let id = generateID();


    let profile = {
        id:id,
        username:username,
        bio:bio,
        repos:[]
    };


    let profiles =
    JSON.parse(localStorage.profiles || "[]");


    profiles.push(profile);

    localStorage.profiles =
    JSON.stringify(profiles);


    alert(
    "Profile created!\n\nURL:\n?P="+id
    );

}



function createRepo(){

    let name =
    document.getElementById("repoName").value;

    let owner =
    document.getElementById("owner").value;


    let id = generateID();


    let repo = {

        id:id,
        owner:owner,
        name:name,
        files:[]

    };


    let repos =
    JSON.parse(localStorage.repos || "[]");


    repos.push(repo);

    localStorage.repos =
    JSON.stringify(repos);


    alert(
    "Repository created!\n\nURL:\n?R="+id
    );

}
