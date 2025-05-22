const timelineElm = document.getElementById('v-timeline'); // Entire timeline.
const tlEventsElm = document.querySelector('.timeline .events'); // Events section.
const tlFooterElm = document.querySelector('.tl-footer'); // Timeline footer.

const URL_ENG = "./events.json";
const URL_GUJ = './events-guj.json';

const MAX_NO_MARKERS = 2;
let WASTIMELINESHOWN = false;

// GLOBAL STATE for tracking the process of fetching and displaying the events on the timeline.
const STATE = {
  URL: URL_ENG,
  tlFooterCurrentClass: null, // Timeline footer; Loading, Message, Error.
  isRightCard: false, // To keep track of event cards that are displayed on right side.
  visibleMarkers: new Set(), // Store all currently visible markers.
  markerIndexCounter: 0 // Index counter for markers. 
};

// Utility function to display appropriate statuses in the timeline footer.
const updateTlFooter = (state = 2) => { // Default loading state.
  // -1 -> No state.
  //  0 -> Error message or failure.
  //  1 -> Just a message or success.
  //  2 -> Loading state.

  // Remove current class.
  if (STATE.tlFooterCurrentClass) tlFooterElm.classList.remove(STATE.tlFooterCurrentClass); 

  if (state == -1) return STATE.tlFooterCurrentClass = null;
  else if (state == 0) STATE.tlFooterCurrentClass = 'error';
  else if (state == 1) STATE.tlFooterCurrentClass = 'message';
  else if (state == 2) STATE.tlFooterCurrentClass = 'load';

  tlFooterElm.classList.add(STATE.tlFooterCurrentClass);

}

// Utility function to change the language of the timeline events.
document.getElementById('language').addEventListener('change', async (event) => {

  const radioElms = event.target.parentElement.querySelectorAll('input');
  // Disable the selection.
  radioElms.forEach(child => child.disabled = true);

  if (event.target.value == "ENGLISH") STATE.URL = URL_ENG;
  else STATE.URL = URL_GUJ;

  resetEventsSection(); // Reset everything inside events section.
  await fetchAndRenderEvents();

  // Enable the selection.
  radioElms.forEach(child => child.disabled = false);

});

// Fetch events and return a promise. Returns an object with state (error or success) and data array or error message.
const fetchEventsFromSource = (sourceURL) => {
  return new Promise((resolve, reject) => {

    fetch(sourceURL)
    .then(response => {
      if (response.ok) return response.json();
      
      if (response.status == 404) throw new Error("File not found!");
    }) // End of first then.
    .then(data => { // content of data: []. Array of events.

      if (!data.length) resolve({ status: -1, message: "END" }); // If everything okay, but no events.

      resolve({ status: 1, events: data }); // Pass the data to the resolve function.

    }) // End of second then.
    .catch(error => { reject({ status: 0, message: error.message }); })

  }); // End of promise{}.
} // End of fetchEventsFromSource().

// Construct HTML for event card.
const createEventCardHTML = (event, isRight) => {

  let cardElm = document.createElement('div');
  cardElm.classList.add('card');

  if (STATE.isRightCard) cardElm.classList.add('right'); // Add class for right side

  // Extract values from event object.
  const date = event.eventDate.trim() ? event.eventDate : "--";

  const image = event.eventImage.trim() ? `<img src="${event.eventImage}" loading="lazy" onerror="this.style.display='none';" alt="${date}"></img>` : "";

  const description = event.eventDescription.trim() ? event.eventDescription : "";

  const descItems = event.eventItems.length ? event.eventItems.map((item, index) => {
    return (index + 1) + ". " + item.item + "<br />"
  }).join("") : "";

  const paragraph = description || descItems ? `<p>${description} <br /> ${descItems} </p>` : "<p>No description.</p>";

  cardElm.innerHTML = `
  <section class="info">
    <span>${date}</span>${image}${paragraph}
  </section>
  `;

  // Create invisible markers along the cards, for vertical height calculation.
  for (let i = 0; i < MAX_NO_MARKERS; i++)
  {
    const markerElm = document.createElement('span'); // Create element span
    markerElm.classList.add('marker'); // Add predefined class for styles.
    let topStyle = Math.round((i + 1) / MAX_NO_MARKERS * 100); // Position for marker. How far from top of the card.
    markerElm.style.top = (topStyle + '%'); // Setting the position.
    markerElm.dataset.index = ++STATE.markerIndexCounter; // Use custom data index to distinguish each marker.
    cardElm.appendChild(markerElm);
  }


  return cardElm;
}

// Insert event cards into the DOM.
const renderEventsToDOM = (events) => {

  events.forEach(event => {
    const cardElm = createEventCardHTML(event, STATE.isRightCard); // Create event card HTML.
    tlEventsElm.appendChild(cardElm); // Append event card.
    STATE.isRightCard = !STATE.isRightCard; // Toggle for alternating sides.

    ShowEventCardObserver.observe(cardElm); // Observe the card for entry in viewport.
    cardElm.querySelectorAll('.marker').forEach(marker => MarkerObserver.observe(marker)); // Observe this card's markers.
  });
}

const calcTMlineHeight = () => {
  let highestTop = 1; // Latest visible marker. 1 for resulting minimum height as 1%.
  
  // Find out: Of all visible markers, which is the most furthest down.
  for (const marker of STATE.visibleMarkers) {
    let markerTop = marker.getBoundingClientRect().top; // Marker's offset from top of the viewport.
    highestTop = Math.max(markerTop, highestTop);
  }
  
  // eventsSecTop can be put in global scope, to avoid recalculation at every call. May not change, unless viewport height changes.
  const eventsSecTop = tlEventsElm.getBoundingClientRect().top; // Events section's offset from the top of the viewport. 
  const offsetFromEventsSec = (highestTop - eventsSecTop) / tlEventsElm.offsetHeight; // Marker's actual offset from top of the Events section.
  const height = Math.round(Math.max(1, Math.min(100, offsetFromEventsSec * 100))); // Final height of the vertical line.
  
  tlEventsElm.style.setProperty('--TM-lineHeight', `${height}%`); // Update the height now.

}

const MarkerObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {

    if (entry.isIntersecting) STATE.visibleMarkers.add(entry.target)
    else STATE.visibleMarkers.delete(entry.target);

    calcTMlineHeight();

  });
}, {
  root: null, // Intersection area, null means full client screen view.
  rootMargin: '0px 0px -20% 0px', // Margin to trigger the event's card entry when it is in view
  threshold: 0 // Trigger when % of the event card is visible
});

// CHECK THE ENTRY OF TIMELINE ITSELF.

// ONLY IF TIMELINE'S EVENTS SECTION BECOMES VISIBLE, CHECK THE ENTRY OF EVENTS ITSELF
const ShowEventCardObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active'); // Add active class to the event element
    } else {
      entry.target.classList.remove('active'); // Remove active class when not in view
    }
  });
}, {
  root: null, // Intersection area, null means full client screen view.
  rootMargin: '200px 0px -100px 0px', // Margin to trigger the event's card entry when it is in view
  threshold: 0 // Trigger when % of the event card is visible
});

// Check for intersection of timeline events section with the viewport.
// Observe individual event card for entry.
// Observe markers to update the height of vertical line.
const TimelineObserver = new IntersectionObserver(async (entries, observer) => {

  const eventsSection = entries[0];

  if (eventsSection.isIntersecting) { // Update vertical line height and observe entry of event cards.

    if(!WASTIMELINESHOWN) { // Run this code only once when the timeline first appears.

      // Get the selected language.
      if (timelineElm.querySelector("#language input[name=language]:checked").value == "GUJARATI") STATE.URL = URL_GUJ; 
      await fetchAndRenderEvents();

      return WASTIMELINESHOWN = true;
    }

    // The following code should only execute, if the timeline REAPPEARS in the viewport.
    // Observe all inactive event cards for entry.
    tlEventsElm.querySelectorAll('.card:not(.active)').forEach(event => ShowEventCardObserver.observe(event));

    // Observe all markers.
    tlEventsElm.querySelectorAll('.marker').forEach(marker => MarkerObserver.observe(marker));

  } else if (WASTIMELINESHOWN) { // Execute only when the timeline leaves the viewport.
    unobserveAll();
  }
  

}, {
  root: null, // Default intersection viewport.
  rootMargin: '0px', // Default margin.
  threshold: 0 // Default threshold.
});

const unobserveAll = () => { // Unobserve all elements, except the timeline.
    // Unobserve all event cards.
  tlEventsElm.querySelectorAll('.card.active').forEach(event => ShowEventCardObserver.unobserve(event));

  // Unobserve all markers.
  tlEventsElm.querySelectorAll('.marker').forEach(marker => MarkerObserver.unobserve(marker));
}

const disconnectAllObservers = () => { // Disconnect all observers, except for timeline.
  MarkerObserver.disconnect();
  ShowEventCardObserver.disconnect();
}

//
const resetEventsSection = () => {

  if (STATE.markerIndexCounter == 0) return; // Not the best way to confirm if events are displayed in the DOM. But works.
  
  // Unobserve all event cards, last event card, and markers.
  unobserveAll();

  // Disconnect all observers.
  disconnectAllObservers();

  // Remove all content from events section.
  tlEventsElm.innerHTML = '';

  
  // Remove all states of the timelline footer.
  updateTlFooter(-1); 

  
  // Reset the STATE.
  STATE.isRightCard = false;
  STATE.markerIndexCounter = 0;
}

const createMessageHTML = (message, state = 1) => {
  updateTlFooter(state); // Message or Error.
  tlFooterElm.children[0].innerHTML = message; // Change the text of the paragraph.
}

// Fetch and render events.
const fetchAndRenderEvents = async () => {

  updateTlFooter(); // Loading state.

  try {
    const data = await fetchEventsFromSource(STATE.URL); // fetch events.

    if (data.status == -1) return createMessageHTML("END", 1); // No events or No more events.

    renderEventsToDOM(data.events); // Render events.

    createMessageHTML("END", 1); // Show message. End of timeline.

  } catch (error) {
    createMessageHTML(error.message, 0); // Display error.

  }
}

TimelineObserver.observe(timelineElm);


