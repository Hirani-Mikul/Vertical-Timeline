const timelineElm = document.querySelector('.timeline');
const eventElms = document.querySelectorAll('.card');

// CHECK THE ENTRY OF TIMELINE ITSELF.

// Calculate the height of vertical line based on how much of total timeline is visible.
const calcLineHeight = () => {
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


const hightlightTM = new IntersectionObserver((entries, observer) => {

  entries.forEach(entry => {
    if (entry.isIntersecting) {
      calcLineHeight();
      document.addEventListener('scroll', calcLineHeight);

      eventElms.forEach(event => {
        showEvents.observe(event); // Observe each event element
      });
    }
    else {
      document.removeEventListener('scroll', calcLineHeight);
      document.documentElement.style.setProperty('--TM-lineHeight', `0%`);

      eventElms.forEach(event => {
        showEvents.unobserve(event); // Observe each event element
      });
    }
  });


}, {
  root: null,
  rootMargin: '0px',
  threshold: 0
});

hightlightTM.observe(timelineElm);


// ONLY IF TIMELINE IS VISIBLE, CHECK THE ENTRY OF EVENTS ITSELF

const showEvents = new IntersectionObserver((entries, observer) => { 
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active'); // Add active class to the event element
    } else {
      entry.target.classList.remove('active'); // Remove active class when not in view
    }
  });
 }, {
  root: null,
  rootMargin: '-0px',
  threshold: 0.2 // Trigger when 10% of the element is visible
});


