Rails.application.routes.draw do
  get 'waypoint/waypoint'
  post 'waypoint/waypoint'
  
  root 'waypoint#waypoint'
end
