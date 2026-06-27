// ── faq.js ───────────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/faq.html (or any page containing FAQ items)
//
// WHAT IT DOES:
//   Handles the interactive FAQ accordion.
//   Allows users to click on a question to expand or collapse its answer.
//
// HOW FAQ TOGGLING WORKS:
//   1. Wait for the page to fully load
//   2. Select all FAQ items on the page
//   3. Attach a click listener to each question
//   4. When clicked, toggle the "active" class on that FAQ item
//   5. CSS uses the "active" class to show or hide the answer
// ─────────────────────────────────────────────────────────────────────────────


document.addEventListener("DOMContentLoaded", () => {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
      item.classList.toggle("active");
    });
  });
});
