# Anime tracker

## Overview
An anime tracking web application that allows users to discover anime titles and manage personal watchlists using the Anilist API with strict rate limiting compliance. This application is optimized for performance with advanced caching and memory management.

## Authentication
- Uses Internet Identity for user authentication
- Persistent login sessions that remain active across browser sessions
- Private access restricted to the user's Internet ID only
- Watchlist features are only available to logged-in users
- Guest users can browse anime but cannot create watchlists
- Login rate limiting: Users are locked out for 10 minutes after 5 consecutive failed login attempts
- Per-user lockout tracking with clear feedback showing remaining wait time during lockout period
- Lockout timer resets after successful login or after the 10-minute period expires

## Main Page Features

### Layout and Display
- Displays all anime titles from the Anilist API database by default
- Paginated display (default 40 per page, options for 80 or 120)
- Fetches and paginates through the entire Anilist anime database
- Each anime displayed in rectangular boxes (150px high, 300px wide) with dark purple outlines
- Organized in 4 rows with 5px separation, grouped 10px from right edge
- Left side displays "Keep track of your anime body count."
- Lazy loading for anime images to improve performance
- Predictive prefetching of images for next page content
- Progressive image loading: display lower-resolution thumbnails first, then replace with high-quality images once loaded
- Smooth fade-in animations for anime boxes and images as they load

### Anime Box Content
- English anime title displayed at the top of each box with sufficient vertical space
- Cover image positioned below title, aligned to the left side of the box, scaled to 100% of its original size to fit within remaining box dimensions without exceeding boundaries
- Up to 3 genre tags with colored backgrounds for visual distinction - positioned on the right side of the box
- Green arrow icon next to titles that have alternate titles available - clicking cycles through alternate titles
- Title and image never overlap or overflow the box boundaries
- All buttons and interactive elements are fully visible and fit comfortably within the box dimensions
- Layout remains visually balanced with all content fitting within the box
- If anime is on user's watchlist: rainbow checkmark and blue "on list" label positioned centered both vertically and horizontally within the anime card
- When hovering over the "on list" label, a floating tooltip appears showing all watchlists the anime is currently part of
- Tooltip appears to the right of the label by default, but if the card is on the rightmost grid column, the tooltip appears to the left instead
- Tooltip styled with solid black background and gold outline to match app theme
- Tooltip displays each watchlist name on a separate line with gold text color and appropriate spacing
- Tooltip appears with smooth fade-in and fade-out animations
- Tooltip handles multiple watchlists gracefully with proper vertical spacing between watchlist names
- Hover zones are isolated so the tooltip does not interfere with other hover functionalities like the image popup
- Tooltip positioning is responsive to card location within the grid layout
- Tooltip renders outside of the anime card container using position: fixed or DOM portal (appended to document.body) to prevent clipping
- Tooltip uses higher z-index to ensure it appears above all other content without being cut off by card boundaries
- Tooltip positioning maintains current behavior (right side by default, left side when near right edge) while allowing overflow beyond card constraints
- Tooltip styling remains consistent with black-and-gold theme and does not interfere with existing image hover popups or other hover effects

### Search, Sorting, and Filtering
- Search bar at top (searches Anilist API, navigates/highlights found title in blue)
- Sorting options: alphabetical order (A-Z, Z-A), aired date (ascending, descending) - fetches and displays all relevant titles from the current API, bringing the most relevant ones to the front page
- Status filtering: users can filter by status (including "ongoing"/"currently airing" option) to bring all relevant titles from the current API to the front page
- Genre filtering: users can select up to 5 genres simultaneously to filter displayed anime - fetches and displays all relevant titles from the current API that match the selected genres
- Genre filter popup has a solid black background with gold outline and is non-transparent
- All dropdown menus across the application have solid, non-transparent black backgrounds at all times (not only on hover), including both open menus and their selection lists
- Smooth slide-down animations for dropdown menus and filter panels
- No dropdown element inherits transparency from parent containers or hover states, ensuring full visibility and legibility of text and options
- Text contrast is maintained for visibility with clearly visible text on all dropdown menus
- Hover states maintain solid coloring and proper text contrast
- Sorting and filtering operate across all available titles in the database, bringing most relevant results to the top
- All sorting and filtering operations work with the complete Anilist anime dataset

### Create Watchlist Button
- Clearly visible "Create Watchlist" button positioned below the main title list area
- Available to logged-in users who want to create a new watchlist
- Opens the existing CreateWatchlistDialog with proper user feedback and success confirmation
- Button remains accessible and visible during normal browsing
- Subtle hover animations with smooth transitions

### Title Click Interaction
- Clicking on any anime title opens a centered popup modal displaying complete anime details
- Modal is 95% wider than the original implementation (increased from 55% to 95%)
- Popup is properly centered on the screen with a clear dark gray background
- Smooth fade-in and scale-up animation when modal opens
- Modal includes "Add to Watchlist" button for logged-in users
- If user has no watchlists, immediately prompt to create first watchlist with name input
- If user has existing watchlists, show watchlist selection dialog
- Titles can be added to multiple watchlists (duplicates allowed across different watchlists)

### Centered Popup Modal
- Modal appears as a centered overlay on top of the main page content with smooth fade-in animation
- Background set to solid dark gray color (non-transparent) consistent with app theme
- Modal width is 95% wider than the original implementation (increased from 55% to 95%)
- Cover image positioned at the top center, limited to its original size without magnification beyond actual dimensions
- Progressive image loading for cover images in modals
- Below the cover image: title with generous spacing
- Below the title: scrollable description column displaying complete synopsis and details
- Description display background set to solid dark blue color (non-transparent)
- Below the description: status, aired date, and number of episodes aired information
- Below the metadata: genre tags arranged in two rows of columns, aligned neatly with proper spacing and colored backgrounds
- At the bottom: rating and "Add to my list" button (logged-in users only) with adequate margins
- All elements maintain centered alignment throughout the vertical layout
- Modal can be closed by clicking outside the modal or with a close button
- Responsive design adapts to different screen sizes while maintaining proportions and usability
- All content elements have sufficient spacing to prevent crowding or overflow and remain well-aligned and visually balanced
- Enlarged modal layout remains properly centered with all content scaling appropriately

### Add to Watchlist Dialog
- When "Add to my list" button is clicked, opens watchlist selection dialog
- Dialog background set to solid dark gray color (non-transparent)
- All text and interactive elements remain clearly visible and accessible against the dark gray background
- Proper contrast maintained for readability and usability
- Smooth fade-in animation when dialog opens

### Create Watchlist Popup
- Create Watchlist popup styled with solid black background and gold outline
- Non-transparent appearance for a sleek look
- All text and interactive elements remain clearly visible against the black background
- Proper contrast maintained for readability and usability
- Smooth fade-in and scale-up animation when popup opens

### Profile Creation Popup
- Profile creation popup styled with solid black background and gold outline
- Non-transparent appearance for improved visibility and consistency across app dialogs
- All text and interactive elements remain clearly visible against the black background
- Proper contrast maintained for readability and usability
- Smooth fade-in and scale-up animation when popup opens

### Select Watchlist Dropdown
- Select Watchlist dropdown styled with solid black background
- Non-transparent appearance to match the app's dark aesthetic
- All text and interactive elements remain clearly visible against the black background
- Proper contrast maintained for readability and usability
- Dropdown background is solid and non-transparent across all instances
- Text color and contrast adjusted to ensure clear visibility against the background
- Styling applied consistently across all dropdown instances related to watchlist selection including add-to-watchlist and move/copy dialogs
- All dropdown menus have non-transparent backgrounds at all times, not just on hover
- Global styling ensures no dropdown element inherits transparency from parent containers or hover states
- Smooth slide-down animations for dropdown menus

### Error Handling and Loading States
- Display loading indicators while fetching anime data from Anilist API
- Show informative error messages if Anilist API fetch fails or returns malformed data
- Display user-friendly messages for network issues, API unavailability, or unexpected response formats
- Provide clear feedback when API responses are invalid or incomplete
- Ensure proper fallback states when no anime data is available
- Handle cases where API returns empty results or missing required fields gracefully

## My Ani Body Count Page (Logged-in Users)

### Backend Connection Management
- Frontend components wait for backend actor initialization before attempting any queries
- Proper loading UI displays during backend connection establishment
- Clear error messages shown if backend connection fails with retry options
- Graceful handling of delayed Internet Identity authentication
- Automatic retry mechanism when actor bundle becomes ready
- All frontend pages reconnect correctly to backend even on slow or intermittent Internet Identity authentication
- Loading states prevent "Connecting to backend" stuck states
- Progress indicators show connection status and initialization progress
- Error boundaries handle connection failures gracefully
- Retry buttons allow users to manually attempt reconnection

### System Information Display Panel
- System information display panel positioned above the canister ID on the MyWatchlistsPage
- Panel styled with solid black background and gold outline to match app aesthetic
- Compact design with reduced padding and smaller font sizes while maintaining clarity and readability
- System information display is hidden by default and only becomes visible when clicked/toggled
- Toggle option allows the entire system information display to be hidden or shown
- When visible, displays current backend canister ID retrieved dynamically from application configuration, environment variables, or canister metadata
- Backend canister ID is fetched from the actual application configuration (dfx.json, actor bindings, or canister metadata) instead of showing "not configured"
- Metadata information section (total metadata storage size and total image storage size) is hidden by default
- Small toggle box labeled "Metadata" allows users to show/hide the metadata information section
- When metadata section is visible, displays total metadata storage size (sum of IndexedDB data excluding images) in real-time
- When metadata section is visible, displays total image storage size (sum of all image blobs stored) in real-time
- Storage size values update automatically whenever storage content changes
- Real-time updates when storage size or canister settings change
- All text and values displayed with proper contrast for readability against black background

### RAM Limit Control
- RAM Limit Control section within the system information display panel
- Visible checkboxes labeled "1 GB", "2 GB", "3 GB", "4 GB", "5 GB", "6 GB", "7 GB", "8 GB" for memory limit selection
- Clear visual indication of selected RAM limit with properly styled checkboxes
- Changes to RAM limit apply immediately in real-time without requiring page reload
- Visual feedback shows current RAM limit setting and updates instantly when adjusted
- RAM limit setting persists locally across browser sessions
- Control styled with solid black background and gold outline to match app theme
- Clear labeling and user feedback for RAM limit adjustments with real-time visual indicators

### RAM Usage Limit Input Field
- RAM usage limit input field within the system information display panel
- Input field accepts values in MB or GB with automatic unit detection and conversion
- Displays current RAM usage and available RAM dynamically in real-time
- Changes to RAM usage limit apply immediately without requiring page reload
- Visual feedback shows current usage against the set limit with progress indicators or color coding
- RAM usage limit setting persists locally across browser sessions
- Input field styled with solid black background and gold outline to match app theme
- Clear labeling shows "RAM Usage Limit" with current and available memory display
- Real-time updates when memory usage changes or limit is adjusted
- Proper validation ensures reasonable limit values and provides user feedback for invalid inputs

### Backend Canister Configuration
- Backend Canister Configuration section within the system information display panel
- Text input field to change the backend canister ID
- When new canister ID is entered, system validates reachability via lightweight IC status check before saving
- Displays confirmation messages for successful canister ID changes
- Displays error messages for invalid or unreachable canister IDs
- All validation feedback uses solid black background with gold outline styling
- Configuration changes are saved and persist across browser sessions
- Proper error handling for network issues during canister validation

### Sync Status Indicator
- Small, unobtrusive sync/cloud icon displayed in the header or watchlist page
- Animated progress feedback when offline changes are syncing back to the backend
- Visual indicator shows sync status: idle, syncing, or error states
- Smooth rotation animation for active sync operations
- Icon changes color or style to indicate different sync states

### Freeze Control Panel
- Top control panel containing search bars, sorting dropdowns, genre filters, and watchlist selector becomes a freeze panel that stays visible while scrolling vertically using fixed or sticky positioning layer detached from the overflow container
- Freeze panel maintains position at the top of the viewport during vertical scrolling
- Panel includes collapsible/restorable behavior with smooth transition animations
- When collapsed, panel minimizes to a small horizontal bar that still follows scroll
- When expanded, panel displays all filters and controls again
- Collapse/expand toggle button clearly visible and accessible
- Smooth transition animations for collapsing and restoring with consistent black-and-gold theme styling
- Freeze panel does not obstruct other UI sections and functions properly with horizontal scrolling enabled
- No visual clipping or jump occurs when scrolling or toggling the panel
- Panel maintains proper z-index to stay above scrolling content without interfering with other modals or popups
- Collapsed state shows essential information or quick access controls while minimizing screen space usage
- Expanded state provides full access to all search, filter, and sorting functionality
- Panel state (collapsed/expanded) persists during the user session
- Responsive design ensures freeze panel works across different screen sizes
- Panel positioning accounts for existing header elements and system information display
- Freeze panel follows the user during vertical scrolling while maintaining proper alignment with the horizontally scrollable content
- Panel remains aligned with the watchlist content during both vertical and horizontal scrolling operations
- Freeze behavior ensures the control panel stays visible and accessible at all times during vertical page navigation
- Panel maintains its horizontal position relative to the scrollable watchlist content to ensure proper visual alignment
- Control panel freeze positioning works seamlessly with the existing side-scroll layout without breaking horizontal navigation
- All existing functionality (filters, sorting, search, genre filters) remains fully operational within the freeze panel

### Watchlist Management
- Users can create and manage multiple watchlists with custom names of any length
- Each watchlist can contain unlimited titles
- Duplicate titles are allowed across different watchlists
- Options to delete titles from lists
- Options to move titles between watchlists with complete preservation of personal data (episodes watched, personal rating, notes, bookmark status)
- Options to copy individual titles from one watchlist to another with complete preservation of personal data (episodes watched, personal rating, notes, bookmark status)
- Users can delete entire watchlists with clear and accessible delete button for each watchlist
- Confirmation dialog required before deleting watchlists to prevent accidental deletion
- Smooth animations for watchlist creation, deletion, and modification actions

### Watchlist Display
- Shows all user's watchlists with gold outline borders and black backgrounds for visual distinction
- Watchlist width set to approximately ¾ of the screen width
- Watchlist height increased by 70% from the original size
- Watchlist layout maintains a static grid size that does not compress or resize when the browser window changes size
- Full screen width rendering with no width or padding constraints from parent containers
- WatchlistView scroll container spans 100vw and supports complete edge-to-edge horizontal scrolling with no clipping on either side
- Inline-flex layout with overflow-x scroll enabled for smooth horizontal navigation
- Genre filters, search bars, and sort/filter controls remain visible during horizontal scrolling via the freeze control panel
- All freeze controls maintain compact alignment and consistent black-and-gold theme during scroll
- Selecting a watchlist displays titles in rows with dynamic height that adjusts based on title length
- Each row contains cover image scaled to fit and aligned to far left
- Title aligned to far left next to cover image with automatic text wrapping for long titles
- Long anime titles automatically wrap onto multiple lines within their designated space
- Row height scales dynamically to accommodate multi-line titles while maintaining visual balance
- All interactive elements (bookmark icon, notepad icon, rating, episodes watched) remain vertically centered regardless of row height
- Text wrapping maintains existing black-and-gold aesthetic and proper alignment
- Bookmark icon on the right side of each watchlist entry (tripled in size)
- Clicking bookmark icon toggles a rainbow glow animation indicating it's bookmarked
- Clicking bookmark icon again removes the rainbow glow animation
- Notepad icon positioned to the right side of each watchlist entry (doubled in size)
- Clicking notepad icon opens a centered popup modal for notes input (up to 120 characters)
- The notes popup modal has a solid black background (non-transparent) and matches the app's gold and dark theme styling
- When notes exist, notepad icon displays a red exclamation mark
- Hovering over notepad icon shows notes in the center of the screen with black non-transparent background and bright purple text
- Pagination for watchlists exceeding 30 titles per page
- Small search bar at bottom left of paginated watchlists to jump directly to specific page
- Genre-based filtering within each watchlist with genre filter popup having solid, non-transparent black background and gold outline
- Smooth fade-in animations for watchlist rows as they load
- Progressive image loading for cover images in watchlist rows
- All watchlists default to sorting entries alphabetically in ascending order (A-Z) whenever they are opened or refreshed
- Default alphabetical sorting applies automatically without requiring user selection from the sorting dropdown
- All existing user sorting options and filters remain available for manual re-sorting after the default order loads

### Watchlist Row Content
- Cover image positioned on the left side of each row, scaled to fit within the row height
- Progressive image loading: display lower-resolution thumbnails first, then replace with high-quality images
- English anime title positioned next to cover image on the far left with automatic text wrapping for long titles
- Title text wraps cleanly within its designated space without truncation or cutoff
- Row height dynamically adjusts to accommodate wrapped title text while maintaining layout consistency
- Genre tags arranged in two columns with a maximum of four genres per column, with black text on brown backgrounds
- Clicking on the genre section opens an inline genre editor for interactive management
- Genre editor allows adding or deleting genres freely with styled tags consistent with the rest of the UI
- Genre editor includes a list of existing genres from all user watchlists as selectable checkboxes for quick addition
- All genre tags and checkboxes maintain consistent black-and-gold visual styling
- To the right of genre columns: gold star icon followed by rating display (shows "N/A" initially, then user's rating after input)
- Clicking on rating text opens input popup for entering rating from 0 to 10 (inclusive, including decimals)
- Episodes watched display at the bottom of each row showing "watched/total" format (e.g., "5/25") with label "Episodes watched"
- Both episodes watched and total episodes are editable inline or via the WatchlistEntryDialog
- Clicking on episodes watched number opens popup input for entering watched episode count
- Clicking on total episodes number opens popup input for entering total episode count
- Both episode fields accept only numeric, non-negative values with proper input validation
- Episode updates synchronize across all watchlists containing the same title to maintain consistency
- Episode editing maintains black-and-gold styling consistent with other watchlist UI elements
- Bookmark icon positioned on the right side of each row (tripled in size) with rainbow glow animation when activated
- Notepad icon positioned to the right side of each row (doubled in size) with red exclamation mark when notes exist
- All interactive elements (icons, rating, episodes watched, total episodes) remain vertically centered within the dynamically sized row
- Title and image never overlap or overflow the row boundaries
- Hovering over row shows additional anime information
- All layout maintains proper alignment within the expanded row format with dynamic height adjustment
- Clicking on a title in the watchlist opens a detailed synopsis popup (WatchlistEntryDialog) that displays complete anime information including synopsis, notes, personal data (ratings, episodes, bookmarks), and additional metadata
- The WatchlistEntryDialog includes editable fields for both episodes watched and total episodes with proper validation
- The watchlist title click handler properly waits for backend actor initialization before querying data to prevent race conditions
- The detailed synopsis popup loads all data reliably with proper error handling and loading states
- Smooth hover animations for interactive elements
- Genre editing integrates smoothly with existing filtering, search, and sorting functions across the watchlist

### Cross-Watchlist Synchronization
- Personal edits (episodes watched, total episodes, personal rating, bookmark status, and notes) for a specific title automatically sync across all watchlists containing that title
- Genre edits for a specific title automatically sync across all watchlists containing that title
- When a user updates any personal metadata or genres for a title in one watchlist, the same changes are immediately reflected in all other watchlists containing that title
- Ensures consistent metadata updates across all instances of the same title
- Backend maintains unified personal data per title per user, regardless of which watchlist the edit was made from
- Bookmark status synchronization is properly implemented to ensure consistent bookmark state across all watchlists containing the same anime title
- Move and copy operations preserve all personal data (episodes watched, total episodes, personal rating, notes, bookmark status, genres) from the source entry
- After move or copy operations, the personal data synchronizes across all watchlists containing the same title to maintain consistency

### Bookmark Filtering
- Small bookmark icon at the top of the watchlist page within the freeze control panel
- When clicked, filters to show only bookmarked titles
- Clicking again shows all titles in the watchlist
- Visual indicator shows when bookmark filter is active
- Bookmark filter works with existing search and genre filtering
- Smooth transitions when filtering content

### Search and Filtering
- Three search bars for watchlist content within the freeze control panel:
  - One search bar for searching titles by text
  - One search bar for searching notes by content
  - One search bar for searching within anime descriptions/synopses
- Synopsis search bar positioned near the existing search bars within the freeze control panel
- Synopsis search filters displayed watchlist entries in real-time to show only those where the synopsis text includes the search term (case-insensitive)
- Synopsis search includes a small "clear" button (✕) to reset the search and show all entries again
- Synopsis search maintains consistent UI styling with solid black background, gold outline, and white text to match current dropdowns and filters
- Synopsis search works smoothly alongside other filters (genre, bookmark, etc.) without breaking pagination or sorting
- Genre-based filter options for watchlist content with genre filter popup having solid, non-transparent black background and gold outline
- Sort options for watchlist entries (alphabetical, by rating, by episodes watched, by personal rating, by aired date)
- Personal rating sort control allows users to select ascending or descending order
- Aired date sort control allows users to select ascending or descending order
- Personal rating and aired date sorting apply instantly without page reload and integrate seamlessly with existing filters
- Sort controls maintain solid black background, gold outline, and consistent visual styling
- Page jump functionality for paginated watchlists
- Bookmark filtering to show only bookmarked titles
- Smooth animations for search results and filter changes
- All dropdown menus have solid, non-transparent black backgrounds with clearly visible text and proper contrast
- Hover states maintain solid coloring and text visibility

### Notes Management
- Users can add notes to any title in their watchlists (up to 120 characters)
- Clicking the notepad icon opens a centered popup modal for note input/editing
- Notes popup modal has a solid black background (non-transparent) with gold and dark theme styling
- Smooth fade-in animation when notes popup opens
- Notes are saved and persisted in the backend
- Notes can be edited or deleted
- Visual indicators show when notes exist for a title
- Hover functionality displays notes with proper styling

### Rating Management
- Users can rate any title in their watchlists from 0 to 10 (inclusive, including decimals)
- Clicking on rating text (initially "N/A") opens input popup for rating entry
- Smooth fade-in animation when rating popup opens
- Ratings are saved and persisted in the backend
- Once submitted, rating replaces "N/A" text display
- Ratings can be edited by clicking on the displayed rating value
- Backend validation accepts values from 0 to 10 (inclusive) including decimals without flagging valid values as invalid

### Episodes Management
- Users can track both episodes watched and total episodes for any title in their watchlists
- Display format shows "watched/total" (e.g., "5/25") with label "Episodes watched"
- Both episodes watched and total episodes are editable with proper input validation
- Clicking on episodes watched number opens input popup for entering watched episode count
- Clicking on total episodes number opens input popup for entering total episode count
- Input validation ensures only numeric, non-negative values are accepted
- Smooth fade-in animation when episode editing popups open
- Episode counts are saved and persisted in the backend with cross-watchlist synchronization
- Episodes watched and total episodes can be updated independently
- Backend safely handles episode updates without breaking existing watchlist functionality

### Genre Management
- Users can interactively manage genres for any title in their watchlists
- Clicking on the genre section of a watchlist entry opens an inline genre editor
- Genre editor allows adding or deleting genres freely
- Existing genres are displayed as styled tags consistent with the rest of the UI
- Genre editor includes a list of existing genres from all user watchlists as selectable checkboxes for quick addition
- All genre tags and checkboxes maintain consistent black-and-gold visual styling
- Genre changes are saved and persisted in the backend with cross-watchlist synchronization
- Genre edits automatically sync across all watchlists containing the same title
- Genre editing integrates smoothly with existing filtering, search, and sorting functions

## Local Caching System
- Implement comprehensive local caching using IndexedDB for AniList API data and images
- Cache anime metadata, cover images, search results, and paginated lists locally on user's device
- Automatic cache updates when changes are detected in AniList API responses
- Overall cache limit of 20 GB with automatic cleanup of older or least-used data when approaching the limit
- Intelligent cache management prioritizing frequently accessed content
- Cache invalidation logic to refresh stale data
- User-initiated cache refresh option for manual data updates
- Graceful fallback to live API requests when cached data is unavailable or expired
- Offline startup capability using cached data for improved user experience
- Efficient storage of large image files and metadata using proper IndexedDB standards
- Background cache maintenance and optimization
- Cache statistics and management interface for users
- Proper error handling for storage quota exceeded scenarios
- Cache compression for optimal storage utilization
- Modularized cache cleanup operations split into smaller asynchronous tasks to prevent UI lag
- Optimized cache pruning with performance monitoring during cleanup operations
- Cache dropdown menu styled with solid black background and gold outline, fully non-transparent to match app styling

## Advanced Caching System
- Backend caching layer for frequently accessed anime data
- Smart caching that reuses cached responses for repeat queries
- Check cache before making new API requests to reduce redundant calls
- Update cache when new data is fetched from the API
- Maintain all current error handling and rate limiting features with caching integration
- Cache management for different data types (anime lists, individual anime details, search queries)
- Proper cache cleanup to prevent excessive storage usage
- Offline operation support for watchlists with local storage
- Asynchronous sync when back online with conflict resolution
- Modularized cache expiration tasks split into smaller operations for better performance

## Offline Queue System
- Queue user actions (ratings, notes, episodes watched, total episodes, genre edits) when offline
- Automatic sync when connection is restored
- Visual indicators for pending sync operations with animated progress feedback
- Conflict resolution for data modified both offline and online
- Sync status indicator showing current sync state and progress

## Performance Optimizations
- Code-splitting to reduce initial bundle size
- Dependency reduction to minimize memory footprint
- Asynchronous rendering for smoother user interactions
- Memory optimization ensuring background processes and caching use no more than 8 GB of RAM
- Efficient garbage collection for cached data
- Lazy loading of non-critical components
- Progressive image loading with thumbnail-first approach for faster initial load times
- Optimized image resolution handling to reduce memory overhead
- Smooth UI animations that are lightweight and don't impact performance
- Modularized cache operations to prevent UI blocking during cleanup tasks

## Footer
- Bottom footer: "Please contact me for feedback or suggestions." (mailto: anibodycount@outlook.com)

## Backend Data Storage
- User profiles and authentication data with persistent session management
- Login attempt tracking per user with timestamps and lockout status
- Failed login attempt counters and lockout expiration times per user
- User watchlists (names of any length, titles, personal ratings, episodes watched, total episodes, notes, genres)
- Complete anime metadata for watchlist entries including synopsis, title, cover image, status, genres, ratings, and aired dates
- User preferences (email visibility, display settings)
- Unified personal data per title per user (bookmark status, notes, personal ratings, episodes watched, total episodes, genres) that syncs across all watchlists containing that title with proper bookmark synchronization logic
- Sync queue data for offline operations and pending changes
- Backend functions to create, read, update, and delete multiple watchlists with unlimited name length
- Backend functions to add and remove titles from watchlists (allowing duplicates across different watchlists)
- Backend functions to store and retrieve complete anime metadata when adding titles to watchlists
- Backend functions to move titles between watchlists with complete preservation of personal data
- Backend functions to copy individual titles from one watchlist to another with complete preservation of personal data
- Backend functions to manage unified personal data per title that automatically syncs across all watchlists containing that title
- Backend functions to toggle bookmark status for watchlist titles with cross-watchlist synchronization and proper consistency logic
- Backend functions to filter watchlists by bookmark status
- Backend functions to create, read, update, and delete notes for watchlist titles with cross-watchlist synchronization
- Backend functions to create, read, update, and delete ratings for watchlist titles with validation accepting 0-10 inclusive and cross-watchlist synchronization
- Backend functions to create, read, update, and delete episodes watched for watchlist titles with cross-watchlist synchronization
- Backend functions to create, read, update, and delete total episodes for watchlist titles with cross-watchlist synchronization and proper validation
- Backend functions to create, read, update, and delete genres for watchlist titles with cross-watchlist synchronization
- Backend functions to retrieve all existing genres from user's watchlists for genre editor checkboxes
- Backend functions to search notes by content
- Backend functions to search within anime descriptions/synopses for watchlist titles with case-insensitive matching
- Backend functions to sort watchlist entries by personal rating in ascending or descending order
- Backend functions to sort watchlist entries by aired date in ascending or descending order
- Backend functions to sort watchlist entries alphabetically in ascending order (A-Z) as the default sorting method
- Enhanced error handling and validation for all watchlist operations including episode and genre management
- Backend functions to support sorting anime by alphabetical order and aired date on the main page
- Backend functions to support filtering anime by status and multiple genres simultaneously
- Backend functions to manage login rate limiting, track failed attempts, and enforce lockout periods
- Backend caching layer for AniList API responses with smart cache management
- Backend functions to support watchlist pagination and page jumping
- Backend functions to support genre-based filtering within watchlists
- Backend functions to support local cache synchronization and validation
- Backend functions to detect and communicate API data changes for cache updates
- Backend functions to manage offline queue operations and sync status tracking
- Backend functions to handle progressive image loading and thumbnail generation
- Backend functions to support watchlist entry dialog data retrieval with proper actor initialization checks and error handling
- Backend functions to validate canister reachability for configuration changes
- Backend functions to support system information queries for storage size calculations
- Backend functions to retrieve current backend canister ID from application configuration or environment
- Backend functions to handle connection initialization and provide status updates to frontend
- Backend functions to support graceful reconnection after Internet Identity authentication delays
- Backend functions to validate actor bundle readiness and provide initialization status
- Backend functions to retrieve watchlist names for anime titles to support tooltip display on main page
- Backend functions to query which watchlists contain specific anime titles for tooltip functionality

## External API Integration and Rate Limiting
- Anilist API for anime data (titles, covers, descriptions, genres, ratings, episode counts, airing status, aired dates, alternate titles)
- All anime content fetched from Anilist API in real-time using GraphQL endpoints
- No anime data stored in backend except for caching
- Backend provides reliable `fetchAnimeFromAnilist` function with comprehensive error handling and robust connectivity
- Strict 90-requests-per-minute rate limit compliance for all Anilist API calls (unauthenticated)
- Request throttling and batching mechanisms to prevent exceeding rate limits
- Automatic request queuing and delayed execution when rate limit is approached
- User feedback system for rate limiting scenarios with clear messages
- Automatic retry mechanism with appropriate delays when rate limits are exceeded
- Rate limiting applies to all anime fetching operations including pagination, search, sorting, and filtering
- Implement thorough response validation to ensure API data matches expected format
- Handle malformed GraphQL responses, missing required fields, and unexpected data structures
- Provide detailed error messages for different failure scenarios (network issues, invalid responses, API rate limits)
- Frontend uses React Query hooks with proper error boundaries
- Proper response handling and state management for GraphQL API calls with graceful degradation
- Ensure stable actor initialization and canister communication
- Implement connection retry logic and comprehensive error recovery for network issues
- Validate all incoming API data before processing to prevent application crashes
- Backend functions to fetch and process anime data for sorting and filtering operations including aired date sorting on the main page
- Support for fetching alternate titles from Anilist API

## Rate Limiting User Experience
- Display clear messages when rate limits are encountered: "Please wait, respecting API rate limits..."
- Show progress indicators during throttled requests
- Automatic retry with user notification: "Retrying request in X seconds..."
- Ensure smooth user experience despite rate limiting constraints
- Batch multiple GraphQL requests when possible to optimize API usage
- Prioritize user-initiated requests over background data fetching

## Login Rate Limiting User Experience
- Display clear error messages when users exceed login attempt limits
- Show remaining lockout time in minutes and seconds: "Account locked. Try again in X minutes Y seconds"
- Update lockout countdown in real-time without requiring page refresh
- Provide clear indication when lockout period expires and login attempts are allowed again
- Reset failed attempt counter after successful login

## Technical Requirements
- Ensure proper Motoko backend actor initialization and availability with connection status monitoring
- Implement robust error handling for backend-frontend communication with retry mechanisms
- Verify canister deployment and network connectivity with real-time status updates
- Establish reliable API endpoint communication between React frontend and Motoko backend with initialization checks
- Implement proper CORS handling and HTTP client configuration for external GraphQL API calls
- Add comprehensive data validation and sanitization for all Anilist API responses
- Ensure application remains functional even when API returns unexpected or incomplete data
- Implement rate limiting infrastructure in both backend and frontend components
- Track and manage API request timing and frequency
- Coordinate rate limiting across multiple concurrent users and requests
- Backend timer management for lockout periods with automatic cleanup of expired lockouts
- Local caching infrastructure with IndexedDB implementation and 20 GB storage management
- Integration of local caching system with existing rate limiting and error handling mechanisms
- Memory management systems to enforce 8 GB RAM limit for background processes and caching
- Code-splitting and lazy loading infrastructure
- Offline queue management with sync capabilities
- Backend infrastructure to support multiple watchlist management with unlimited name length
- Frontend components for watchlist creation, pagination, and filtering
- Backend infrastructure to support bookmark functionality and filtering with cross-watchlist synchronization and proper consistency logic
- Backend infrastructure to support notes functionality with search capabilities and cross-watchlist synchronization
- Backend infrastructure to support rating functionality with decimal precision and proper 0-10 validation and cross-watchlist synchronization
- Backend infrastructure to support episodes watched tracking with validation and cross-watchlist synchronization
- Backend infrastructure to support total episodes tracking with validation and cross-watchlist synchronization
- Backend infrastructure to support genre management functionality with cross-watchlist synchronization
- Frontend infrastructure for inline genre editor with styled tags and checkbox selection
- Backend infrastructure to support synopsis search functionality with case-insensitive matching
- Backend infrastructure to support personal rating sorting with ascending and descending order options
- Backend infrastructure to support aired date sorting with ascending and descending order options for both main page and watchlists
- Backend infrastructure to support default alphabetical sorting (A-Z) for all watchlists when opened or refreshed
- Local cache synchronization and validation systems
- Storage quota management and cleanup mechanisms
- Progressive image loading infrastructure with thumbnail support
- Animation system for smooth UI transitions without performance impact
- Sync status tracking and indicator system
- Modularized cache cleanup system with asynchronous task splitting
- Enhanced move and copy operations that preserve and synchronize all personal data across watchlists
- Watchlist entry dialog infrastructure with proper backend actor initialization checks and race condition prevention
- Click handler binding system for watchlist titles that ensures stable backend communication before data queries
- System information display infrastructure with real-time storage size calculation and display
- RAM limit control system with immediate application and local persistence
- RAM usage limit input system with real-time monitoring and dynamic display of current and available memory
- Backend canister configuration system with reachability validation and error handling
- IC status check functionality for canister validation
- Dynamic backend canister ID retrieval from application configuration, environment variables, or canister metadata
- Toggle functionality for metadata information display with persistent state management
- Full screen width rendering system with no width or padding constraints from parent containers
- WatchlistView scroll container infrastructure spanning 100vw with complete edge-to-edge horizontal scrolling support
- Inline-flex layout system with overflow-x scroll enabled for smooth horizontal navigation
- Freeze positioning system for genre filters, search bars, and sort/filter controls during horizontal scrolling via the freeze control panel
- Compact alignment system for freeze controls that maintains black-and-gold theme consistency
- Frontend connection management system that waits for backend actor initialization before queries
- Loading UI infrastructure for backend connection establishment with progress indicators
- Error boundary system for connection failures with retry functionality
- Automatic reconnection system for delayed Internet Identity authentication
- Actor bundle readiness detection and retry mechanisms
- Connection status monitoring and user feedback systems
- Tooltip system for main page anime cards showing watchlist membership with smooth animations and responsive positioning
- Backend query system to retrieve watchlist names for specific anime titles to populate tooltips
- Tooltip rendering system using position: fixed or DOM portal (appended to document.body) to prevent clipping by card containers
- Higher z-index tooltip system to ensure tooltips appear above all other content without being cut off by card boundaries
- Tooltip positioning system that maintains current behavior (right side by default, left side when near right edge) while allowing overflow beyond card constraints
- Freeze control panel infrastructure with collapsible/restorable behavior and smooth transition animations
- Panel state persistence system for collapsed/expanded state during user session
- Z-index management system for freeze panel to stay above scrolling content without interfering with modals or popups
- Responsive design system for freeze panel across different screen sizes
- Panel positioning system that accounts for existing header elements and system information display
- Freeze panel positioning system that follows vertical scrolling while maintaining proper horizontal alignment with scrollable content
- Panel alignment system that ensures the control panel remains visually aligned with watchlist content during both vertical and horizontal scrolling
- Freeze behavior implementation that keeps the control panel visible and accessible during vertical page navigation
- Horizontal position maintenance system that keeps the panel aligned with the watchlist content during side-scrolling operations
- Integration system that ensures freeze panel functionality works seamlessly with existing side-scroll layout without breaking horizontal navigation

## Production Deployment
- Application is ready for live production deployment
- All features and functionality have been implemented and tested
- Backend and frontend components are production-ready
- Rate limiting and error handling mechanisms are in place
- User authentication and data persistence are fully functional
- Local caching system optimizes performance and enables offline functionality
- Performance optimizations ensure smooth user experience
- Progressive image loading and UI animations enhance user experience
- Sync indicators provide clear feedback for offline operations
- System information display and configuration controls are fully functional
- RAM usage monitoring and limit controls provide real-time memory management
- Full screen width rendering with complete edge-to-edge horizontal scrolling provides consistent user experience across different viewport sizes
- Backend connection management ensures reliable operation even with slow or intermittent authentication
- Genre management functionality allows interactive editing with cross-watchlist synchronization
- Default alphabetical sorting ensures consistent watchlist presentation across all user sessions
- Tooltip functionality on main page provides clear watchlist membership information with smooth animations and responsive positioning based on card location
- Tooltip rendering system prevents clipping by card containers using position: fixed or DOM portal with higher z-index
- Freeze control panel with collapsible/restorable behavior provides enhanced user experience during vertical scrolling
- Freeze panel follows vertical scrolling while maintaining proper alignment with horizontally scrollable content
- Control panel freeze positioning works seamlessly with existing side-scroll layout without breaking horizontal navigation functionality
- Application is deployed to production environment and accessible to all users

## Application Language
- All content and user interface elements displayed in English
