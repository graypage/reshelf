// ─────────────────────────────────────────────────────
// interests.js
// ─────────────────────────────────────────────────────

const userEmail = localStorage.getItem("userEmail");

if (!userEmail) {
    window.location.href = "login.html";
}

// ----------------------------
// Load Interested Listings
// ----------------------------

async function loadInterests() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/interests",
            {
                headers: {
                    "x-user-email": userEmail
                }
            }
        );

        if (!response.ok)
            throw new Error("Failed to load interests.");

        const listings = await response.json();

        const grid = document.getElementById("interests-grid");

        if (listings.length === 0) {

            grid.innerHTML =
                '<div class="empty-state">No interests yet.</div>';

            return;

        }

        grid.innerHTML = "";

        listings.forEach(listing => {

            grid.innerHTML += `

                <div class="listing-card">

                    <img
                        src="${listing.image}"
                        alt="${listing.title}"
                    >

                    <div class="listing-content">

                        <h3>${listing.title}</h3>

                        <p>$${listing.price}</p>

                    </div>

                </div>

            `;

        });

    }
    catch (err) {

        console.error(err);

        document.getElementById("interests-grid").innerHTML =
            '<div class="empty-state">Failed to load interests.</div>';

    }

}

// ----------------------------

document.addEventListener("DOMContentLoaded", () => {

    loadInterests();

});