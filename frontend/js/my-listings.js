// ─────────────────────────────────────────────────────
// my-listings.js
// ─────────────────────────────────────────────────────

const userEmail = localStorage.getItem("userEmail");

if (!userEmail) {
    window.location.href = "login.html";
}

// Switch between Active and Old tabs
function switchTab(tab) {

    document.querySelectorAll(".tab").forEach(t =>
        t.classList.remove("active")
    );

    document.querySelectorAll(".tab-panel").forEach(panel =>
        panel.classList.remove("active")
    );

    if (tab === "active") {
        document.querySelectorAll(".tab")[0].classList.add("active");
        document.getElementById("tab-active").classList.add("active");
    }
    else {
        document.querySelectorAll(".tab")[1].classList.add("active");
        document.getElementById("tab-old").classList.add("active");
    }

}

// Make switchTab available to HTML
window.switchTab = switchTab;

// ----------------------------
// Load Listings
// ----------------------------

async function loadListings() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/my-listings",
            {
                headers: {
                    "x-user-email": userEmail
                }
            }
        );

        if (!response.ok)
            throw new Error("Failed to load listings.");

        const data = await response.json();

        displayListings(
            data.active,
            document.getElementById("active-listings"),
            "No active listings."
        );

        displayListings(
            data.old,
            document.getElementById("old-listings"),
            "No old listings."
        );

    }
    catch (err) {

        console.error(err);

    }

}

// ----------------------------

function displayListings(listings, container, emptyMessage) {

    if (listings.length === 0) {

        container.innerHTML =
            `<div class="empty-state">${emptyMessage}</div>`;

        return;

    }

    container.innerHTML = "";

    listings.forEach(listing => {

        container.innerHTML += `

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

// ----------------------------

document.addEventListener("DOMContentLoaded", () => {

    loadListings();

});