const timelineElm = document.querySelector('.timeline');

let events = [];

const MAX_EVENTS_TO_FETCH = 5; // Maximum number of events to fetch
const CURRENT_FETCHED_INDEX = 0; // Current index of the fetched events

const loadEventsFromSource = (sourceUrl) => {
  return new Promise((resolve, reject) => {
    fetch(sourceUrl)
      .then((response) => {
        if (!response.ok)
        {
          if (response.status == 404) throw new Error("File not found!");;
        }

        return response.json();
      })
      .then((data) => {
        events = data;
        resolve(true);
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

  let cardElm = document.createElement('div');
  cardElm.classList.add('card');
  if (isRight) cardElm.classList.add('right'); // Add class for right side

  cardElm.innerHTML = `
      <section class="info">
        ${bImg ? `<img src="${event.eventImage}" alt="${event.bDate}"></img>` : ""}
        ${bTitle ? `<h3>${event.eventTitle}</h3>` : ""}
        ${bDesc ? `<p>${event.eventDescription}</p>` : "No description available."}
        <button>Read More</button>
      </section>
      <section class="offset">
        <span>${event.eventDate}</span>
        <span>${event.eventTime}</span>
      </section>
  `;

  
  return cardElm;
}

const renderEvents = () => {
  let isEven = false;

  if (events.length > 0) {
    events.forEach((event, index) => {
      let cardElm = createEventCardHTML(event, isEven);
      timelineElm.appendChild(cardElm); // Append the card to the timeline
      isEven = !isEven; // Toggle the isEven variable for alternating sides
    });
  }

  timelineElm.appendChild(createEventCardHTML(events[0])); // Add the first event to the timeline
}


// CHECK THE ENTRY OF TIMELINE ITSELF.

// Calculate the height of vertical line based on how much of total timeline is visible.
const calcTMlineHeight = () => {
  let viewHeight = window.innerHeight; // Height of the viewport
  let clientHeight = timelineElm.getBoundingClientRect().height; // Height of the timeline element
  let revealTop = (timelineElm.getBoundingClientRect().y * -1); // Top of the timeline.

  // Height of the vertical line is calculated as a percentage of the total height of the timeline element.
  // -5 is offset acts as a reveal point.
  let height = Math.round((revealTop + viewHeight) / clientHeight * 100) - 5;

  // Constraints for the height of the vertical line.
  if (height > 99) height = 99;
  if (height < 1) height = 1;

  document.documentElement.style.setProperty('--TM-lineHeight', `${height}%`);
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


const hightlightTMobserver = new IntersectionObserver((entries, observer) => {

  entries.forEach(entry => {
    if (entry.isIntersecting) {
      calcTMlineHeight(); // Calculate the height of the vertical line when the timeline is in view
      document.addEventListener('scroll', calcTMlineHeight);

      
      document.querySelectorAll('.card').forEach(event => {
        showEventsObserver.observe(event); // Observe each event element
      });
    }
    else {
      document.removeEventListener('scroll', calcTMlineHeight);
      document.documentElement.style.setProperty('--TM-lineHeight', `0%`);

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


const Initate = async () => {
  let status = await loadEventsFromSource('./events.json'); // Load events from JSON file
  if (status == true) 
  {
    renderEvents();
    hightlightTMobserver.observe(timelineElm);
  }
  else {
    createErrorHTML(status);
  }
  

}

Initate();