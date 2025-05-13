const timelineElm = document.querySelector('.timeline .events');

let events = []; // Array to hold events
let isEven = false;


let SELECTEDLANGUAGE = 'ENGLISH';
let LASTFETCHEDINDEX = 0;
const MAXEVENTSTOFETCH = 2;


document.getElementById('language').addEventListener('change', (event) => {
    if (event.target.type === "radio") {
      SELECTEDLANGUAGE = event.target.value;
      resetTimeline();
      Initiate();
    }
});

document.getElementById('sort').addEventListener('change', (event) => {
    if (event.target.type === "radio") {
        console.log("Selected value:", event.target.value);
    }
});




const fetchEventsFromSource = (sourceUrl) => {
  return new Promise((resolve, reject) => {
    fetch(sourceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ LASTFETCHEDINDEX, MAXEVENTSTOFETCH, SELECTEDLANGUAGE })
    })
      .then((response) => {
        if (response.ok) return response.json();

        throw new Error("File not found!");
      })
      .then((data) => {
        if (data.events.length == 0) {
          bAllEventsFetched = true;
          resolve(-1);
          return -1; // -1: No more events.
        }
        events = [...events, ...data.events];
        resolve(1); // 1: Successfully loaded more events.
      })
      .catch((error) => {
        resolve(error.message);
      });
  });
}



const createEventCardHTML = (event, isRight) => {
  let bTitle = event.eventTitle != "" ? true : false;
  let bDate = event.eventDate != "" ? true : false;
  let bTime = event.eventTime != "" ? true : false; 
  let bDesc = event.eventDescription != "" ? true : false;
  let bImg = event.eventImage != "" ? true : false;
  let bItem = event.eventItems ? true : false;


  let cardElm = document.createElement('div');
  cardElm.classList.add('card');

  if (isRight) cardElm.classList.add('right'); // Add class for right side

  cardElm.innerHTML = `
      <section class="info">
        ${bImg ? `<img src="${event.eventImage}" alt="${event.bDate}"></img>` : ""}
        ${bTitle ? `<h3>${event.eventTitle}</h3>` : ""}
        ${bDesc || bItem ? `<p>${event.eventDescription} <br/> ${
          bItem ? event.eventItems.map((item, index) => { return (index + 1) + ". " + item.item + "<br/>"; }).join(""): ""
          } </p>` : "<p>No description available.</p>"}
      </section>
      <section class="offset">
        <span>${event.eventDate}</span>
        <span>${event.eventTime}</span>
      </section>
  `;

  
  return cardElm;
}

const renderEvents = () => {

  if (events.length <= 0) return;

  for (let i = LASTFETCHEDINDEX; i < events.length; i++)
  {
    let cardElm = createEventCardHTML(events[i], isEven); // Create event card.
    timelineElm.appendChild(cardElm); // Append the card to the timeline
    isEven = !isEven; // Toggle the isEven variable for alternating sides
    showEventsObserver.observe(cardElm); // Observe each cards for entering viewport.
  }

  LASTFETCHEDINDEX = events.length - 1;
}


// CHECK THE ENTRY OF TIMELINE ITSELF.

// Calculate the height of vertical line based on how much of total timeline is visible.
const calcTMlineHeight = () => {
  let viewHeight = window.innerHeight; // Height of the viewport
  let clientHeight = timelineElm.getBoundingClientRect().height; // Height of the timeline element
  let revealTop = (timelineElm.getBoundingClientRect().y * -1); // Top of the timeline.

  // Height of the vertical line is calculated as a percentage of the total height of the timeline element.
  // -5 is offset acts as a reveal point.
  let height = Math.round((revealTop + viewHeight) / clientHeight * 100) - 2;

  // Constraints for the height of the vertical line.
  if (height > 100) height = 100;
  if (height < 1) height = 1;

  timelineElm.style.setProperty('--TM-lineHeight', `${height}%`);
}

// ONLY IF TIMELINE IS VISIBLE, CHECK THE ENTRY OF EVENTS ITSELF
const showEventsObserver = new IntersectionObserver((entries, observer) => { 
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active'); // Add active class to the event element
    } else {
      entry.target.classList.remove('active'); // Remove active class when not in view
    }
  });
 }, {
  root: null,
  rootMargin: '200px 0px -100px 0px', // Margin to trigger the event when it is in view
  threshold: 0 // Trigger when 20% of the element is visible
});

const loadMoreEventsObserver = new IntersectionObserver(async (entries, observer) => {

  const lastEvent = entries[0];
  if (!lastEvent.isIntersecting) return;

  await fetchAndRenderEvents();
  
  loadMoreEventsObserver.unobserve(lastEvent.target);

}, {});


const hightlightTMobserver = new IntersectionObserver((entries, observer) => {

  entries.forEach(entry => {
    if (entry.isIntersecting) {
      calcTMlineHeight(); // Calculate the height of the vertical line when the timeline is in view
      document.addEventListener('scroll', calcTMlineHeight);


      // Observe each event card.
      document.querySelectorAll('.card:not(.active)').forEach(event => {
        showEventsObserver.observe(event); // Unobserve each event element
      });

    }
    else {
      document.removeEventListener('scroll', calcTMlineHeight);
      timelineElm.style.setProperty('--TM-lineHeight', `0%`); // Reset the height of the vertical line when not in view
      // document.documentElement.style.setProperty('--TM-lineHeight', `0%`);

      document.querySelectorAll('.card.active').forEach(event => {
        showEventsObserver.unobserve(event); // Unobserve each event element
      });
    }
  });


}, {
  root: null,
  rootMargin: '0px',
  threshold: 0
});

const resetTimeline = () => {

  // Unobserve all event cards.
  showEventsObserver.disconnect();

  // Unobserve the last event card.
  loadMoreEventsObserver.disconnect();

  // Unobserve the timeline events.
  hightlightTMobserver.disconnect();

  timelineElm.innerHTML = '';

  document.removeEventListener('scroll', calcTMlineHeight);

  isEven = false;
  LASTFETCHEDINDEX = 0;
  events = [];


}

const createErrorHTML = (error) => { 
  timelineElm.classList.add('error');
  
  let errorElm = document.createElement('div');
  errorElm.classList.add('message');
  errorElm.innerHTML = `
    <h2>Error Loading Events</h2>
    <p>${error}</p>
  `;
  timelineElm.appendChild(errorElm); // Append the error message to the timeline
}


const fetchAndRenderEvents = async () => {
  
  let status = await fetchEventsFromSource('http://localhost:3000/request.php'); // Load events from JSON file
  
  if (status != -1 && status != 1) return createErrorHTML(status); 
  
  if (status == -1) return -1; // No more events to render.

  renderEvents();
  // loadMoreEventsObserver.observe(document.querySelector(".timeline .card:last-child"));
  
}

const Initiate = async () => {
  let status = await fetchAndRenderEvents();
  
  hightlightTMobserver.observe(timelineElm); // Observe the timeline element for visibility

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