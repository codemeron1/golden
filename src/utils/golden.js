  export const extractSubTasks = (taskDescription) => {
    const removeValues = ['<ol>', '<li>', '</ol>'];
    const regex = new RegExp(removeValues.join('|'), 'g');
    let taskArray = taskDescription.replace(regex, "").split("</li>");
    let taskArrayRemovedBlank = taskArray.filter((task) => task !== '');

    return taskArrayRemovedBlank;
  };