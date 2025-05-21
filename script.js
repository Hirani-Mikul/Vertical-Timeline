const tlEventsElm = document.querySelector('.timeline .events'); // Events section.
const tlFooterElm = document.getElementById('tl-footer'); // Timeline footer.

const URL = "http://localhost:3000/request.php";

const MAX_NO_MARKERS = 2;

// GLOBAL STATE for tracking the process of fetching and displaying the events on the timeline.
const STATE = {
  selectedLanguage: 'ENGLISH', // Current event's language.
  tlFooterCurrentClass: null, // Timeline footer; Loading, Message, Error.
  isRightCard: false, // To keep track of event cards that are displayed on right side.
  lastFetchedEventIndex: 0, // Index of last event fetched from the server.
  visibleMarkers: new Set(), // Store all currently visible markers.
  markerIndexCounter: 0 // Index counter for markers. 
};

// Handle observer's lifecycle
const observerManager = {
  
  unobserveAll() { // Unobserve all elements of all observers.
    observerManager.unobserveActiveEventCards();
    observerManager.unobserveLastCard(document.querySelector('.card:last-child'));
    observerManager.unobserveEventsContainer();
    observerManager.unobserveMarkers();
  },

  disconnectAll() { // Disconnect all observers.
    showEventCardObserver.disconnect();
    loadMoreEventsObserver.disconnect();
    hightlightTMobserver.disconnect();
    markerObserver.disconnect();
  },

  observeEventsContainer() { // Observe the event's section for it's entry.
    hightlightTMobserver.observe(tlEventsElm);
  },

  unobserveEventsContainer() { // Observe the event's section for it's entry.
    hightlightTMobserver.unobserve(tlEventsElm);
  },

  observeIndividualCard(eventCard) {
    showEventCardObserver.observe(eventCard);
  },

  observeLastCard() { // Observe last fetched event card, to fetch more events.
    const lastCard = tlEventsElm.querySelector('.card:last-child');
    if (lastCard) loadMoreEventsObserver.observe(lastCard);
  },

  unobserveLastCard(prevLastCard) { // Observe last fetched event card, to fetch more events.
    loadMoreEventsObserver.unobserve(prevLastCard);
  },

  observeInactiveEventCards() { // Observe inactive event cards.
    document.querySelectorAll('.card:not(.active)').forEach(event => {
      showEventCardObserver.observe(event);
    });
  },

  unobserveActiveEventCards() { // Unobserve active event cards.
    document.querySelectorAll('.card.active').forEach(event => {
      showEventCardObserver.unobserve(event); 
    });
  },

  observeNewMarkers(markers) { // Observe new markers.
    markers.forEach(marker => markerObserver.observe(marker));
  },
  
  observeMarkers() { // Observe all markers.
    document.querySelectorAll('.marker').forEach(marker => markerObserver.observe(marker));
  },

  unobserveMarkers() { // Unobserve all markers.
    document.querySelectorAll('.marker').forEach(marker => markerObserver.unobserve(marker));
  }

}

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

  STATE.selectedLanguage = event.target.value;
  resetEventsSection(); // Reset everything inside events section.
  await Initiate(); // Restart the timeline.

  // Enable the selection.
  radioElms.forEach(child => child.disabled = false);

});

// Fetch events and return a promise. Returns an object with state (error or success) and data array or error message.
const fetchEventsFromSource = (sourceURL) => {
  return new Promise((resolve, reject) => {

    fetch(sourceURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ LASTFETCHEDINDEX: STATE.lastFetchedEventIndex, SELECTEDLANGUAGE: STATE.selectedLanguage }) // Last fetched event index and language.
    }) // End of fetch.
    .then(response => {
      if (response.ok) return response.json();

      throw new Error(response.message);
    }) // End of first then.
    .then(data => { // content of data: { events: [], LASTFETCHEDINDEX: 0 }. Array and Integer.

      if (!data.events.length) resolve({ status: -1, message: "END" }); // If everything okay, but no more events.

      resolve({ status: 1, ...data }); // Pass the data to the resolve function.

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

    observerManager.observeIndividualCard(cardElm); // Observe the card for entry in viewport.
    observerManager.observeNewMarkers(cardElm.querySelectorAll('.marker')); // Observe each marker.
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

const markerObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {

    if (entry.isIntersecting) {
      STATE.visibleMarkers.add(entry.target);
      entry.target.style.backgroundColor = 'green'; // For debugging. Remove this line.
    }
    else {
      STATE.visibleMarkers.delete(entry.target);
      entry.target.style.backgroundColor = 'tomato'; // For debugging. Remove this line.
    }

    calcTMlineHeight();

  });
}, {
  root: null, // Intersection area, null means full client screen view.
  rootMargin: '0px 0px -20% 0px', // Margin to trigger the event's card entry when it is in view
  threshold: 0 // Trigger when % of the event card is visible
});

// CHECK THE ENTRY OF TIMELINE ITSELF.

// ONLY IF TIMELINE'S EVENTS SECTION BECOMES VISIBLE, CHECK THE ENTRY OF EVENTS ITSELF
const showEventCardObserver = new IntersectionObserver((entries, observer) => {
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

// Observe if the user has reached the last event card, to fetch more events from the server.
const loadMoreEventsObserver = new IntersectionObserver(async (entries, observer) => {

  const lastEvent = entries[0];
  if (!lastEvent.isIntersecting) return;

  // Unobserve the current last card.
  observerManager.unobserveLastCard(lastEvent.target);

  // Fetch more events from the server.
  await fetchAndRenderEvents();


}, {}); // No options, using the default.


// Check for intersection of timeline events section with the viewport.
// Observe individual event card for entry.
// Observe markers to update the height of vertical line.
const hightlightTMobserver = new IntersectionObserver((entries, observer) => {

  const eventsSection = entries[0];

  if (eventsSection.isIntersecting) { // Update vertical line height and observe entry of event cards.

    // Observe each inactive event card for entry.
    observerManager.observeInactiveEventCards();

  } else {

    // Unobserve each event card.
    observerManager.unobserveActiveEventCards();

    // Unobserve markers.
    observerManager.unobserveMarkers();
  }

}, {
  root: null, // Default intersection viewport.
  rootMargin: '0px', // Default margin.
  threshold: 0 // Default threshold.
});

//
const resetEventsSection = () => {

  
  // Unobserve all event cards, last event card, events container, and markers.
  observerManager.unobserveAll();

  // Disconnect all observers.
  observerManager.disconnectAll();

  tlEventsElm.innerHTML = '';

  
  // Remove all states of the timelline footer.
  updateTlFooter(-1); 

  
  // Reset the STATE.
  STATE.isRightCard = false;
  STATE.lastFetchedEventIndex = 0;
}

const createMessageHTML = (message, state = 1) => {
  updateTlFooter(state); // Message or Error.
  tlFooterElm.innerHTML = `<p>${message}</p>`;
}

// Fetch and render events.
const fetchAndRenderEvents = async (url = URL) => {

  updateTlFooter(); // Loading state.

  try {
    const data = await fetchEventsFromSource(url); // fetch events.

    if (data.status == -1) return createMessageHTML("END", 1); // No events or No more events.

    STATE.lastFetchedEventIndex = data.LASTFETCHEDINDEX; // Update the last fetched event index.
    renderEventsToDOM(data.events); // Render events.

    updateTlFooter(-1); // Remove the current class state.

    // Observe the entry of the last event card for loading more events.
    observerManager.observeLastCard();

  } catch (error) {
    createMessageHTML(error.message, 0); // Display error.

  }
}

const init = async () => {
  // Fetch events.
  // Render events.
  // Observe everything.
}

const Initiate = async () => {


  if (await fetchAndRenderEvents() != 1) return;

  observerManager.observeEventsContainer(); // Observe the entry of Events section.
}

Initiate();



/*
const hightlightTMobserver = new IntersectionObserver((entries, observer) => {

  entries.forEach(entry => {
    if (entry.isIntersecting) {

      fetchAndRenderEvents(() => {
        calcTMlineHeight(); // Calculate the height of the vertical line when the timeline is in view
        document.addEventListener('scroll', calcTMlineHeight);


        document.querySelectorAll('.card').forEach(event => {
          showEventsObserver.observe(event); // Observe each event element
        });
       });
    }
    else {
      document.removeEventListener('scroll', calcTMlineHeight);
      timelineElm.style.setProperty('--TM-lineHeight', `0%`); // Reset the height of the vertical line when not in view
      // document.documentElement.style.setProperty('--TM-lineHeight', `0%`);

      document.querySelectorAll('.card').forEach(event => {
        showEventsObserver.unobserve(event); // Observe each event element
      });
    }
  });


}, {
  root: null,
  rootMargin: '0px',
  threshold: 0
});


*/







// const loadEventsFromSource = (sourceUrl) => {
//   return new Promise((resolve, reject) => {
//     fetch(sourceUrl)
//       .then((response) => {
//         if (!response.ok)
//         {
//           if (response.status == 404) throw new Error("File not found!");;
//         }

//         return response.json();
//       })
//       .then((data) => {
//         events = data;
//         resolve(true);
//       })
//       .catch((error) => {
//         resolve(error.message);
//       });
//   });
// }