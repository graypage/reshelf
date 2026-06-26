document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".settings-tab");
  const sections = document.querySelectorAll(".settings-section");
  const messageBox = document.getElementById("settings-message");

  const profileForm = document.getElementById("profile-section");
  const accountForm = document.getElementById("account-section");
  const passwordForm = document.getElementById("password-section");
  const preferencesForm = document.getElementById("preferences-section");

  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const passwordInputs = [
    document.getElementById("currentPassword"),
    document.getElementById("newPassword"),
    document.getElementById("confirmPassword"),
  ];

  // This is the backend API route created in backend/server.js
  const API_BASE = "http://localhost:3000/api/settings";

  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = passwordInputs[0].type === "password";

    passwordInputs.forEach((input) => {
      input.type = isHidden ? "text" : "password";
    });

    togglePasswordBtn.textContent = isHidden
      ? "Hide Password"
      : "Show Password";
  });

  // Load saved settings from backend when the page opens
  loadSavedSettings();

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetSectionId = tab.dataset.section;

      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");

      sections.forEach((section) => {
        section.style.display =
          section.id === targetSectionId ? "block" : "none";
      });

      hideMessage();
    });
  });

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profileData = {
      displayName: document.getElementById("displayName").value.trim(),
      university: document.getElementById("university").value.trim(),
      major: document.getElementById("major").value.trim(),
      bio: document.getElementById("bio").value.trim(),
    };

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error("Profile settings could not be saved");
      }

      showMessage("Profile settings saved successfully.", "success");
    } catch (err) {
      showMessage("Error saving profile settings.", "error");
    }
  });

  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (email && !isValidEmail(email)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    const accountData = {
      email,
      phone,
    };

    try {
      const response = await fetch(`${API_BASE}/account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        throw new Error("Account settings could not be saved");
      }

      showMessage("Account settings saved successfully.", "success");
    } catch (err) {
      showMessage("Error saving account settings.", "error");
    }
  });

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("Please fill in all password fields.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("New password must be at least 6 characters long.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("New password and confirm password do not match.", "error");
      return;
    }

    passwordForm.reset();

    passwordInputs.forEach((input) => {
      input.type = "password";
    });

    togglePasswordBtn.textContent = "Show Password";

    showMessage("Password updated successfully for this demo.", "success");
  });

  preferencesForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const preferencesData = {
      defaultUniversity: document
        .getElementById("defaultUniversity")
        .value.trim(),
      preferredCategory: document.getElementById("preferredCategory").value,
      meetupPreference: document.getElementById("meetupPreference").value,
    };

    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferencesData),
      });

      if (!response.ok) {
        throw new Error("Preferences could not be saved");
      }

      showMessage("Marketplace preferences saved successfully.", "success");
    } catch (err) {
      showMessage("Error saving marketplace preferences.", "error");
    }
  });

  async function loadSavedSettings() {
    try {
      const savedProfile = await fetch(`${API_BASE}/profile`).then((res) =>
        res.json(),
      );

      const savedAccount = await fetch(`${API_BASE}/account`).then((res) =>
        res.json(),
      );

      const savedPreferences = await fetch(`${API_BASE}/preferences`).then(
        (res) => res.json(),
      );

      document.getElementById("displayName").value =
        savedProfile.displayName || "";
      document.getElementById("university").value =
        savedProfile.university || "";
      document.getElementById("major").value = savedProfile.major || "";
      document.getElementById("bio").value = savedProfile.bio || "";

      document.getElementById("email").value = savedAccount.email || "";
      document.getElementById("phone").value = savedAccount.phone || "";

      document.getElementById("defaultUniversity").value =
        savedPreferences.defaultUniversity || "";
      document.getElementById("preferredCategory").value =
        savedPreferences.preferredCategory || "";
      document.getElementById("meetupPreference").value =
        savedPreferences.meetupPreference || "";
    } catch (err) {
      console.error("Could not load saved settings:", err);
    }
  }

  function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.style.display = "block";

    if (type === "success") {
      messageBox.style.background = "#e8f5e9";
      messageBox.style.color = "#3a7d44";
      messageBox.style.border = "1px solid rgba(58, 125, 68, 0.25)";
    } else {
      messageBox.style.background = "#fdecea";
      messageBox.style.color = "#c0392b";
      messageBox.style.border = "1px solid rgba(192, 57, 43, 0.25)";
    }
  }

  function hideMessage() {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});
