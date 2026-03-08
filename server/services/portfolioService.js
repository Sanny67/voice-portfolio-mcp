// portfolioService.js
// In-memory store for the uploaded portfolio

let currentPortfolio = [];

/** Store portfolio uploaded by the user */
function setPortfolio(holdings) {
  currentPortfolio = holdings;
}

/** Retrieve the stored portfolio */
function getPortfolio() {
  return currentPortfolio;
}

/** Check if a portfolio has been loaded */
function hasPortfolio() {
  return currentPortfolio.length > 0;
}

module.exports = { setPortfolio, getPortfolio, hasPortfolio };
