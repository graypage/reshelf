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

  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = passwordInputs[0].type === "password";

    passwordInputs.forEach((input) => {
      input.type = isHidden ? "text" : "password";
    });

    togglePasswordBtn.textContent = isHidden
      ? "Hide Password"
      : "Show Password";
  });

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

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const profileData = {
      displayName: document.getElementById("displayName").value.trim(),
      university: document.getElementById("university").value.trim(),
      major: document.getElementById("major").value.trim(),
      bio: document.getElementById("bio").value.trim(),
    };

    localStorage.setItem("reshelfProfileSettings", JSON.stringify(profileData));
    showMessage("Profile settings saved successfully.", "success");
  });

  accountForm.addEventListener("submit", (event) => {
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

    localStorage.setItem("reshelfAccountSettings", JSON.stringify(accountData));
    showMessage("Account settings saved successfully.", "success");
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

  preferencesForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const preferencesData = {
      defaultUniversity: document
        .getElementById("defaultUniversity")
        .value.trim(),
      preferredCategory: document.getElementById("preferredCategory").value,
      meetupPreference: document.getElementById("meetupPreference").value,
    };

    localStorage.setItem(
      "reshelfMarketplacePreferences",
      JSON.stringify(preferencesData),
    );
    showMessage("Marketplace preferences saved successfully.", "success");
  });

  function loadSavedSettings() {
    const savedProfile =
      JSON.parse(localStorage.getItem("reshelfProfileSettings")) || {};
    const savedAccount =
      JSON.parse(localStorage.getItem("reshelfAccountSettings")) || {};
    const savedPreferences =
      JSON.parse(localStorage.getItem("reshelfMarketplacePreferences")) || {};

    document.getElementById("displayName").value =
      savedProfile.displayName || "";
    document.getElementById("university").value = savedProfile.university || "";
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
