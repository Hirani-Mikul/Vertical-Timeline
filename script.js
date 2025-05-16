const tlEventsElm = document.querySelector('.timeline .events'); // Events section.
const tlFooterElm = document.getElementById('tl-footer'); // Timeline footer.

const URL = "http://localhost:3000/request.php";
const URL_LOCAL = "./events.json";



// GLOBAL STATE for tracking the process of fetching and displaying the events on the timeline.
const STATE = {
  selectedLanguage: 'ENGLISH', // Current event's language.
  tlFooterCurrentClass: null, // Timeline footer; Loading, Message, Error.
  isRightCard: false, // To keep track of event cards that are displayed on right side.
  lastFetchedEventIndex: 0 // Index of last event fetched from the server.
};

// Utility function to display appropriate statuses in the timeline footer.
const updateTlFooter = (state = 0) => {
  // -1 -> No state.
  //  0 -> Loading state.
  //  1 -> Just a message.
  //  2 -> Error message.

  // Remove current class.
  if (STATE.tlFooterCurrentClass) tlFooterElm.classList.remove(STATE.tlFooterCurrentClass); 

  if (state == -1) return STATE.tlFooterCurrentClass = null;
  else if (state == 0) STATE.tlFooterCurrentClass = 'load';
  else if (state == 1) STATE.tlFooterCurrentClass = 'message';
  else if (state == 2) STATE.tlFooterCurrentClass = 'error';

  tlFooterElm.classList.add(STATE.tlFooterCurrentClass);

}

// Utility function to change the language of the timeline events.
document.getElementById('language').addEventListener('change', async (event) => {
  if (event.target.type != 'radio') return;

  // Disable the selection.
  event.target.parentElement.querySelectorAll('input').forEach(child => child.disabled = true);

  STATE.selectedLanguage = event.target.value;
  resetEventsSection(); // Reset everything inside events section.
  await Initiate(); // Restart the timeline.

  // Enable the selection.
  event.target.parentElement.querySelectorAll('input').forEach(child => child.disabled = false);

});

// Fetch events and return a promise.
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
    .then(data => {
      if (!data.events.length) resolve(0); // If everything okay, but no more events.

      resolve(data); // Pass the data to the resolve function.

    }) // End of second then.
    .catch(error => { reject(error.message); })

  }); // End of promise.
}

// Construct HTML for event card.
const createEventCardHTML = (event, isRight) => {

  let cardElm = document.createElement('div');
  cardElm.classList.add('card');

  if (STATE.isRightCard) cardElm.classList.add('right'); // Add class for right side

  cardElm.innerHTML = `
  <section class="info">
      <span>${event.eventDate.trim() ? event.eventDate : "--"}</span>
      ${event.eventImage.trim() ? `<img src="${event.eventImage}" alt="${event.bDate}"></img>` : ""}

      ${event.eventDescription.trim() || event.eventItems.length ? `<p>${event.eventDescription} <br/> ${event.eventItems.length ? event.eventItems.map((item, index) => { return (index + 1) + ". " + item.item + "<br/>"; }).join("") : ""
      } </p>` : "<p>No description available.</p>"}
    
    </section>
  `;


  return cardElm;
}

// Insert event cards into the DOM.
const renderEventsToDOM = (events) => {

  events.forEach(event => {
    const cardElm = createEventCardHTML(event, STATE.isRightCard); // Create event card HTML.
    tlEventsElm.appendChild(cardElm); // Append event card.
    STATE.isRightCard = !STATE.isRightCard; // Toggle for alternating sides.
    showEventCardObserver.observe(cardElm); // Observe the card for entry in viewport.
  });
}


// CHECK THE ENTRY OF TIMELINE ITSELF.

// Calculate the height of vertical line based on how much of total timeline's events section is visible.
const calcTMlineHeight = () => {
  let viewHeight = window.innerHeight; // Height of the viewport/client area screen.
  let clientHeight = tlEventsElm.getBoundingClientRect().height; // Height of the events section element
  let revealTop = (tlEventsElm.getBoundingClientRect().y * -1); // Top of the timeline's events section.

  // Height of the vertical line is calculated as a percentage of the total height of the timeline's events section element.
  // -2 is an offset acting as a reveal point.
  let height = Math.round((revealTop + viewHeight) / clientHeight * 100) - 2;

  // Constraints for the height of the vertical line.
  if (height > 100) height = 100;
  if (height < 1) height = 1;

  // Setting the variable property of the events section.
  // CSS is reading this property to adjust the height of the vertical line.
  tlEventsElm.style.setProperty('--TM-lineHeight', `${height}%`);
}

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
  loadMoreEventsObserver.unobserve(lastEvent.target);

  // Fetch more events from the server.
  await fetchAndRenderEvents();


}, {}); // No options, using the default.


// Check for intersection of timeline events section with the viewport.
// Update the height of vertical line.
// Observe individual event card for entry.
const hightlightTMobserver = new IntersectionObserver((entries, observer) => {

  const eventsSection = entries[0];

  if (eventsSection.isIntersecting) { // Update vertical line height and observe entry of event cards.
    calcTMlineHeight(); // Calculate the height of the vertical line when the timeline is in view
    document.addEventListener('scroll', calcTMlineHeight); // Add a scroll listener, to update height as the user scrolls.

    // Observe each inactive event card for entry.
    document.querySelectorAll('.card:not(.active)').forEach(event => {
      showEventCardObserver.observe(event);
    });

  } else { // If not intersecting, then.
    // Remove scroll listener, no need if the events section is not in view.
    document.removeEventListener('scroll', calcTMlineHeight);

    // Reset the height of the vertical line.
    timelineElm.style.setProperty('--TM-lineHeight', `0%`);

    // Unobserve each event card.
    document.querySelectorAll('.card.active').forEach(event => {
      showEventCardObserver.unobserve(event); 
    });

  }

}, {
  root: null, // Default intersection viewport.
  rootMargin: '0px', // Default margin.
  threshold: 0 // Default threshold.
});

//
const resetEventsSection = () => {

  
  // Unobserve all event cards and disconnect the observer.
  document.querySelectorAll('.card.active').forEach(event => {
    showEventCardObserver.unobserve(event); 
  });

  showEventCardObserver.disconnect();

  // Unobserve the last event card and disconnect the observer.
  loadMoreEventsObserver.unobserve(tlEventsElm.querySelector(".card:last-child"));
  loadMoreEventsObserver.disconnect();

  // Unobserve the timeline events section and disconnect the observer.
  hightlightTMobserver.unobserve(tlEventsElm);
  hightlightTMobserver.disconnect();

  // Remove the scroll listener.
  document.removeEventListener('scroll', calcTMlineHeight);

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

  // 0: no more events
  try {
    const data = await fetchEventsFromSource(url); // fetch events.
    if (!data || !data.events.length)
    {

      createMessageHTML("END", 1); // No events or No more events.
      return 0;
    } 

    STATE.lastFetchedEventIndex = data.LASTFETCHEDINDEX; // Update the last fetched event index.
    renderEventsToDOM(data.events); // Render events.

    updateTlFooter(-1); // Remove the current class state.

    // Observe the entry of the last event card for loading more events.
    loadMoreEventsObserver.observe(tlEventsElm.querySelector(".card:last-child"));

    return 1;

  } catch (error) {
    createMessageHTML(error, 2); // Display error.
    return 2;
  }
}

const Initiate = async () => {


  if (await fetchAndRenderEvents() != 1) return;

  hightlightTMobserver.observe(tlEventsElm); // Observe the timeline element for visibility

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