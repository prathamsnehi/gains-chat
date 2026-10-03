Pod::Spec.new do |s|
  s.name           = 'GainsLocalStore'
  s.version        = '1.0.0'
  s.summary        = 'Private Core Data and CloudKit storage for Gains Chat'
  s.description    = 'Local persistence and private iCloud synchronization for workouts.'
  s.author         = 'Gains Chat'
  s.homepage       = 'https://github.com/prathamsnehi/gainschat-firebase'
  s.license        = { :type => 'Proprietary', :text => 'Internal application module.' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/prathamsnehi/gainschat-firebase.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreData', 'CloudKit'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
