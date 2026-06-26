// Gets the logged in user's email.
// Your login page should store this after login.
const userEmail = localStorage.getItem("userEmail");

if (!userEmail) {
    window.location.href = "login.html";
}

// ----------------------------
// Load Profile Information
// ----------------------------

async function loadProfile() {

    try {

        const response = await fetch("http://localhost:3000/api/profile", {
            headers: {
                "x-user-email": userEmail
            }
        });

        if (!response.ok)
            throw new Error("Unable to load profile.");

        const user = await response.json();

        document.getElementById("profile-avatar").textContent =
            user.name.charAt(0).toUpperCase();

        document.getElementById("profile-name").textContent =
            user.name;

        document.getElementById("profile-uni").textContent =
            user.university || "";

        document.getElementById("profile-location").textContent =
            user.location || "";

        document.getElementById("profile-joined").textContent =
            user.joined
                ? `Joined ${user.joined}`
                : "";

        document.getElementById("profile-bio").textContent =
            user.bio || "";

    }
    catch (err) {

        console.error(err);

        alert("Failed to load profile.");

    }

}

// ----------------------------
// Load Active Listings
// ----------------------------

async function loadListings() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/profile/listings",
            {
                headers: {
                    "x-user-email": userEmail
                }
            }
        );

        if (!response.ok)
            throw new Error();

        const listings = await response.json();

        const grid = document.getElementById("profile-listings");

        if (listings.length === 0) {

            grid.innerHTML =
                '<div class="empty-state">No listings yet.</div>';

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

    }

}

// ----------------------------

loadProfile();

loadListings();