const app = document.getElementById("app");

const params = new URLSearchParams(window.location.search);

const P = params.get("P");
const R = params.get("R");

fetch("data.json")
.then(res => res.json())
.then(data => {

    if(P){

        let user = data.profiles.find(
            p => p.id === P
        );

        if(user){
            app.innerHTML = `
            <div class="card">
                <h2>${user.username}</h2>
                <p>${user.bio}</p>
                <h3>Repositories</h3>
                ${user.repos.join("<br>")}
            </div>`;
        }

    } else if(R){

        let repo = data.repositories.find(
            r => r.id === R
        );

        if(repo){
            app.innerHTML = `
            <div class="card">
                <h2>${repo.owner}/${repo.name}</h2>
                <p>${repo.description}</p>
            </div>`;
        }

    } else {

        app.innerHTML = `
        <div class="card">
            <h2>Welcome to Warped</h2>
            <p>Build. Share. Collaborate.</p>
        </div>`;
    }

});
