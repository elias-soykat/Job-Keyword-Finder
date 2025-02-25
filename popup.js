document.addEventListener("DOMContentLoaded", async function () {
  const API_KEY = "AIzaSyAzU1T7TMacGakwn05VgdvxfvD0i4Akac4";
  const API_URL =
    "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";

  const resultDiv = document.createElement("div");
  resultDiv.style.margin = "10px";
  resultDiv.style.padding = "10px";
  resultDiv.style.backgroundColor = "#f3f6f8";
  resultDiv.style.borderRadius = "4px";
  resultDiv.style.maxHeight = "400px";
  resultDiv.style.overflow = "auto";

  document.body.appendChild(resultDiv);

  // Skeleton loading HTML
  const skeletonHTML = `
    <div class="skeleton-container">
      <div class="skeleton-line" style="width: 60%;"></div>
      <div class="skeleton-line" style="width: 80%;"></div>
      <div class="skeleton-line" style="width: 70%;"></div>
      <div class="skeleton-line" style="width: 75%;"></div>
      <div class="skeleton-line" style="width: 65%;"></div>
    </div>
  `;

  // Add skeleton styles
  const style = document.createElement("style");
  style.textContent = `
    .skeleton-container {
      padding: 10px;
    }
    .skeleton-line {
      height: 15px;
      margin: 10px 0;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);

  // Simple markdown to HTML converter
  function convertMarkdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^\* (.*$)/gm, "<li>$1</li>")
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\n/g, "<br>");
  }

  async function analyzeJob() {
    try {
      // Show loading skeleton immediately
      resultDiv.innerHTML = skeletonHTML;

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const article = document.querySelector(
            "article.jobs-description__container"
          );
          return article ? article.textContent.trim() : null;
        },
      });

      if (!results || !results[0] || !results[0].result) {
        resultDiv.innerHTML = convertMarkdownToHtml(
          "**Error:** Please open a job posting first"
        );
        return;
      }

      const jobDescription = results[0].result;

      const prompt = `Based on the following job description, provide a structured analysis with:
        1. Required skills
        2. Location
        3. Is this a remote job?
        
        Job Description:
        ${jobDescription}
        
        Please provide a concise response using markdown formatting with bullet points and sections.`;

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to get response");
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      resultDiv.innerHTML = convertMarkdownToHtml(generatedText);
    } catch (error) {
      resultDiv.innerHTML = convertMarkdownToHtml(
        `**Error:** ${error.message}`
      );
      console.error("Error:", error);
    }
  }

  // Start analysis immediately when popup opens
  analyzeJob();
});

// Function to be injected into the page
function getJobDetails() {
  const article = document.querySelector("article.jobs-description__container");
  return article ? article.textContent.trim() : null;
}
