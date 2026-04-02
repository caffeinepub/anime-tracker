import AccessControl "authorization/access-control";
import OutCall "http-outcalls/outcall";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Char "mo:core/Char";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";



actor {
  var accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    emailPublic : Bool;
    displaySettings : {
      boxSize : Nat;
      rowSize : Nat;
    };
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type AnimeEntry = {
    anilistId : Nat;
    title : Text;
    coverUrl : Text;
    genres : [Text];
    publicRating : Nat;
    episodesAvailable : Nat;
    airingStatus : Text;
    airedDate : Text;
    description : Text;
  };

  public type WatchlistEntry = {
    anime : AnimeEntry;
    alternateTitles : [Text];
    personalRating : Float;
    episodesWatched : Nat;
    notes : Text;
    isBookmarked : Bool;
  };

  public type Watchlist = {
    name : Text;
    entries : [WatchlistEntry];
    isPublic : Bool;
    entryCount : Nat;
  };

  public type UserWatchlists = {
    watchlists : [Watchlist];
  };

  let userWatchlists = Map.empty<Principal, UserWatchlists>();
  let globalGenres = Map.empty<Text, Nat>();

  public shared ({ caller }) func createWatchlist(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create watchlists");
    };

    if (name.size() == 0) {
      Runtime.trap("Watchlist name cannot be empty");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { { watchlists = [] } };
      case (?watchlists) { watchlists };
    };

    if (currentWatchlists.watchlists.size() >= 20) {
      Runtime.trap("Cannot create more than 20 watchlists");
    };

    if (currentWatchlists.watchlists.find(func(watchlist) { watchlist.name == name }) != null) {
      Runtime.trap("Watchlist with this name already exists");
    };

    let newWatchlist : Watchlist = {
      name;
      entries = [];
      isPublic = false;
      entryCount = 0;
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.concat([newWatchlist]);
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public shared ({ caller }) func addAnimeToWatchlist(watchlistName : Text, anime : AnimeEntry, alternateTitles : [Text]) : async () {
    checkRateLimit(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add anime to watchlists");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          if (watchlist.name == watchlistName) {
            let newEntry : WatchlistEntry = {
              anime;
              alternateTitles;
              personalRating = 0.0;
              episodesWatched = 0;
              notes = "";
              isBookmarked = false;
            };

            {
              name = watchlist.name;
              entries = watchlist.entries.concat([newEntry]);
              isPublic = watchlist.isPublic;
              entryCount = watchlist.entries.size() + 1;
            };
          } else {
            watchlist;
          };
        }
      );
    };

    updateGlobalGenres(anime.genres);
    userWatchlists.add(caller, updatedWatchlists);
  };

  func updateGlobalGenres(genres : [Text]) : () {
    for (genre in genres.values()) {
      switch (globalGenres.get(genre)) {
        case (null) {
          globalGenres.add(genre, 1);
        };
        case (?count) {
          globalGenres.add(genre, count + 1);
        };
      };
    };
  };

  func getGlobalGenresArray() : [Text] {
    let usedGenres = List.empty<Text>();
    let iter = globalGenres.entries();
    iter.forEach(
      func((genre, count)) {
        if (count > 0) {
          usedGenres.add(genre);
        };
      }
    );
    usedGenres.toArray();
  };

  public shared ({ caller }) func updateGenres(_ : Text, anilistId : Nat, newGenres : [Text]) : async () {
    checkRateLimit(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update genres");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          {
            name = watchlist.name;
            entries = watchlist.entries.map(
              func(entry) {
                if (entry.anime.anilistId == anilistId) {
                  let updatedAnime = { entry.anime with genres = newGenres };
                  { entry with anime = updatedAnime };
                } else {
                  entry;
                };
              }
            );
            isPublic = watchlist.isPublic;
            entryCount = watchlist.entries.size();
          };
        }
      );
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public shared ({ caller }) func updateWatchlistEntry(_ : Text, anilistId : Nat, personalRating : Float, episodesWatched : Nat, notes : Text) : async () {
    checkRateLimit(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update watchlist entries");
    };

    if (notes.size() > 1000) {
      Runtime.trap("Notes must be 1,000 characters or less");
    };

    if (personalRating < 0.0 or personalRating > 10.0) {
      Runtime.trap("Personal rating must be between 0 and 10");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    var maxEpisodes : Nat = 0;
    for (watchlist in currentWatchlists.watchlists.vals()) {
      for (entry in watchlist.entries.vals()) {
        if (entry.anime.anilistId == anilistId) {
          maxEpisodes := entry.anime.episodesAvailable;
        };
      };
    };

    if (episodesWatched > maxEpisodes) {
      Runtime.trap("Episodes watched cannot exceed episodes available");
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          {
            name = watchlist.name;
            entries = watchlist.entries.map(
              func(entry) {
                if (entry.anime.anilistId == anilistId) {
                  {
                    anime = entry.anime;
                    alternateTitles = entry.alternateTitles;
                    personalRating;
                    episodesWatched;
                    notes;
                    isBookmarked = entry.isBookmarked;
                  };
                } else {
                  entry;
                };
              }
            );
            isPublic = watchlist.isPublic;
            entryCount = watchlist.entries.size();
          };
        }
      );
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public shared ({ caller }) func deleteWatchlist(watchlistName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete watchlists");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.filter(func(watchlist) { watchlist.name != watchlistName });
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public shared ({ caller }) func removeAnimeFromWatchlist(watchlistName : Text, anilistId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove anime from watchlists");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          if (watchlist.name == watchlistName) {
            {
              name = watchlist.name;
              entries = watchlist.entries.filter(func(entry) { entry.anime.anilistId != anilistId });
              isPublic = watchlist.isPublic;
              entryCount = watchlist.entries.filter(func(entry) { entry.anime.anilistId != anilistId }).size();
            };
          } else {
            watchlist;
          };
        }
      );
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public shared ({ caller }) func setWatchlistPublic(watchlistName : Text, isPublic : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update watchlist privacy");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          if (watchlist.name == watchlistName) {
            {
              name = watchlist.name;
              entries = watchlist.entries;
              isPublic;
              entryCount = watchlist.entries.size();
            };
          } else {
            watchlist;
          };
        }
      );
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public shared ({ caller }) func toggleBookmark(_ : Text, anilistId : Nat) : async () {
    checkRateLimit(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle bookmarks");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    var newBookmarkState : Bool = false;
    for (watchlist in currentWatchlists.watchlists.vals()) {
      for (entry in watchlist.entries.vals()) {
        if (entry.anime.anilistId == anilistId) {
          newBookmarkState := not entry.isBookmarked;
        };
      };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          {
            name = watchlist.name;
            entries = watchlist.entries.map(
              func(entry) {
                if (entry.anime.anilistId == anilistId) {
                  {
                    anime = entry.anime;
                    alternateTitles = entry.alternateTitles;
                    personalRating = entry.personalRating;
                    episodesWatched = entry.episodesWatched;
                    notes = entry.notes;
                    isBookmarked = newBookmarkState;
                  };
                } else {
                  entry;
                };
              }
            );
            isPublic = watchlist.isPublic;
            entryCount = watchlist.entries.size();
          };
        }
      );
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public query ({ caller }) func getBookmarkedTitles(watchlistName : Text) : async ?[WatchlistEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookmarked titles");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { return null };
      case (?watchlists) { watchlists };
    };

    switch (currentWatchlists.watchlists.find(func(watchlist) { watchlist.name == watchlistName })) {
      case (null) { return null };
      case (?watchlist) {
        let bookmarkedEntries = watchlist.entries.filter(func(entry) { entry.isBookmarked });
        if (bookmarkedEntries.size() > 0) {
          return ?bookmarkedEntries;
        } else {
          return ?[];
        };
      };
    };
  };

  public query ({ caller }) func getUserWatchlists(user : Principal) : async ?UserWatchlists {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own watchlists");
    };

    userWatchlists.get(user);
  };

  public query ({ caller }) func getCallerWatchlists() : async ?UserWatchlists {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view watchlists");
    };
    userWatchlists.get(caller);
  };

  public query ({ caller }) func getWatchlistNamesForAnime(anilistId : Nat) : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can query watchlist membership");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { return [] };
      case (?watchlists) { watchlists };
    };

    let matchingWatchlists = List.empty<Text>();
    for (watchlist in currentWatchlists.watchlists.vals()) {
      for (entry in watchlist.entries.vals()) {
        if (entry.anime.anilistId == anilistId) {
          matchingWatchlists.add(watchlist.name);
        };
      };
    };

    matchingWatchlists.toArray();
  };

  public query func getGlobalGenres() : async [Text] {
    getGlobalGenresArray();
  };

  private func synchronizePersonalFields(allWatchlists : UserWatchlists, anilistId : Nat) : UserWatchlists {
    var latestPersonalRating : Float = 0.0;
    var latestEpisodesWatched : Nat = 0;
    var latestNotes : Text = "";
    var latestIsBookmarked : Bool = false;

    for (watchlist in allWatchlists.watchlists.vals()) {
      for (entry in watchlist.entries.vals()) {
        if (entry.anime.anilistId == anilistId) {
          latestPersonalRating := entry.personalRating;
          latestEpisodesWatched := entry.episodesWatched;
          latestNotes := entry.notes;
          latestIsBookmarked := entry.isBookmarked;
        };
      };
    };

    let updatedWatchlists = allWatchlists.watchlists.map(
      func(watchlist) {
        {
          name = watchlist.name;
          entries = watchlist.entries.map(
            func(entry) {
              if (entry.anime.anilistId == anilistId) {
                {
                  anime = entry.anime;
                  alternateTitles = entry.alternateTitles;
                  personalRating = latestPersonalRating;
                  episodesWatched = latestEpisodesWatched;
                  notes = latestNotes;
                  isBookmarked = latestIsBookmarked;
                };
              } else {
                entry;
              };
            }
          );
          isPublic = watchlist.isPublic;
          entryCount = watchlist.entries.size();
        };
      }
    );

    { watchlists = updatedWatchlists };
  };

  public shared ({ caller }) func moveAnimeToWatchlist(fromWatchlist : Text, toWatchlist : Text, anilistId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can move anime between watchlists");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    var entryToMove : ?WatchlistEntry = null;

    for (watchlist in currentWatchlists.watchlists.vals()) {
      if (watchlist.name == fromWatchlist) {
        for (entry in watchlist.entries.vals()) {
          if (entry.anime.anilistId == anilistId) {
            entryToMove := ?entry;
          };
        };
      };
    };

    switch (entryToMove) {
      case (null) { Runtime.trap("Anime not found in source watchlist") };
      case (?entry) {
        let updatedWatchlists = {
          watchlists = currentWatchlists.watchlists.map(
            func(watchlist) {
              if (watchlist.name == fromWatchlist) {
                {
                  name = watchlist.name;
                  entries = watchlist.entries.filter(func(e) { e.anime.anilistId != anilistId });
                  isPublic = watchlist.isPublic;
                  entryCount = watchlist.entries.filter(func(e) { e.anime.anilistId != anilistId }).size();
                };
              } else if (watchlist.name == toWatchlist) {
                {
                  name = watchlist.name;
                  entries = watchlist.entries.concat([entry]);
                  isPublic = watchlist.isPublic;
                  entryCount = watchlist.entries.concat([entry]).size();
                };
              } else {
                watchlist;
              };
            }
          );
        };

        let synchronizedWatchlists = synchronizePersonalFields(updatedWatchlists, anilistId);
        userWatchlists.add(caller, synchronizedWatchlists);
      };
    };
  };

  public shared ({ caller }) func copyAnimeToWatchlist(fromWatchlist : Text, toWatchlist : Text, anilistId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can copy anime between watchlists");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    var entryToCopy : ?WatchlistEntry = null;

    for (watchlist in currentWatchlists.watchlists.vals()) {
      if (watchlist.name == fromWatchlist) {
        for (entry in watchlist.entries.vals()) {
          if (entry.anime.anilistId == anilistId) {
            entryToCopy := ?entry;
          };
        };
      };
    };

    switch (entryToCopy) {
      case (null) { Runtime.trap("Anime not found in source watchlist") };
      case (?entry) {
        let updatedWatchlists = {
          watchlists = currentWatchlists.watchlists.map(
            func(watchlist) {
              if (watchlist.name == toWatchlist) {
                {
                  name = watchlist.name;
                  entries = watchlist.entries.concat([entry]);
                  isPublic = watchlist.isPublic;
                  entryCount = watchlist.entries.concat([entry]).size();
                };
              } else {
                watchlist;
              };
            }
          );
        };

        let synchronizedWatchlists = synchronizePersonalFields(updatedWatchlists, anilistId);
        userWatchlists.add(caller, synchronizedWatchlists);
      };
    };
  };

  public shared ({ caller }) func updateTotalEpisodes(anilistId : Nat, newTotalEpisodes : Nat) : async () {
    checkRateLimit(caller);

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update total episodes");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { Runtime.trap("No watchlists found") };
      case (?watchlists) { watchlists };
    };

    let updatedWatchlists = {
      watchlists = currentWatchlists.watchlists.map(
        func(watchlist) {
          {
            name = watchlist.name;
            entries = watchlist.entries.map(
              func(entry) {
                if (entry.anime.anilistId == anilistId) {
                  let updatedAnime = { entry.anime with episodesAvailable = newTotalEpisodes };
                  let validatedEpisodesWatched = if (entry.episodesWatched > newTotalEpisodes) {
                    newTotalEpisodes;
                  } else {
                    entry.episodesWatched;
                  };
                  {
                    anime = updatedAnime;
                    alternateTitles = entry.alternateTitles;
                    personalRating = entry.personalRating;
                    episodesWatched = validatedEpisodesWatched;
                    notes = entry.notes;
                    isBookmarked = entry.isBookmarked;
                  };
                } else {
                  entry;
                };
              }
            );
            isPublic = watchlist.isPublic;
            entryCount = watchlist.entries.size();
          };
        }
      );
    };

    userWatchlists.add(caller, updatedWatchlists);
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public type RateLimitInfo = {
    lastRequestTime : Int;
    requestCount : Nat;
  };

  let rateLimits = Map.empty<Principal, RateLimitInfo>();
  var guestRateLimit : RateLimitInfo = {
    lastRequestTime = 0;
    requestCount = 0;
  };

  func checkRateLimit(caller : Principal) : () {
    let currentTime = Time.now();
    let userRole = AccessControl.getUserRole(accessControlState, caller);
    let isGuest = switch (userRole) {
      case (#guest) { true };
      case (_) { false };
    };

    let (maxRequestsPerSecond, rateLimitInfo) = if (isGuest) {
      (1, guestRateLimit);
    } else {
      let info = switch (rateLimits.get(caller)) {
        case (null) {
          {
            lastRequestTime = currentTime;
            requestCount = 1;
          };
        };
        case (?info) { info };
      };
      (3, info);
    };

    let timeSinceLastRequest = currentTime - rateLimitInfo.lastRequestTime;

    if (timeSinceLastRequest < 1_000_000_000) {
      if (rateLimitInfo.requestCount >= maxRequestsPerSecond) {
        let waitTime : Int = (1_000_000_000 - timeSinceLastRequest) / 1_000_000;
        Runtime.trap("Rate limit exceeded. Please wait " # (waitTime.toNat()).toText() # " milliseconds before retrying.");
      };

      let updatedInfo = {
        lastRequestTime = rateLimitInfo.lastRequestTime;
        requestCount = rateLimitInfo.requestCount + 1;
      };

      if (isGuest) {
        guestRateLimit := updatedInfo;
      } else {
        rateLimits.add(caller, updatedInfo);
      };
    } else {
      let updatedInfo = {
        lastRequestTime = currentTime;
        requestCount = 1;
      };

      if (isGuest) {
        guestRateLimit := updatedInfo;
      } else {
        rateLimits.add(caller, updatedInfo);
      };
    };
  };

  public shared ({ caller }) func fetchAnimeFromAnilist(graphqlQuery : Text) : async Text {
    checkRateLimit(caller);

    let url = "https://graphql.anilist.co";
    let headers = [
      {
        name = "Content-Type";
        value = "application/json";
      },
    ];

    let response = await OutCall.httpPostRequest(url, headers, graphqlQuery, transform);

    let responseArray = response.toArray();
    if (response.size() == 0 or (responseArray.size() > 0 and responseArray[0] != '{' and responseArray[0] != '[')) {
      Runtime.trap("Invalid response from Anilist API: " # response);
    };

    response;
  };

  public query func sortAnimeEntries(animeEntries : [AnimeEntry], sortBy : Text, ascending : Bool) : async [AnimeEntry] {
    let compareFunc = func(a : AnimeEntry, b : AnimeEntry) : { #less; #equal; #greater } {
      switch (sortBy) {
        case ("title") {
          if (ascending) {
            Text.compare(a.title, b.title);
          } else {
            Text.compare(b.title, a.title);
          };
        };
        case ("airedDate") {
          let aDate : Int = switch (Text.compare(a.airedDate, "")) {
            case (#equal) { 0 };
            case (#less) { -1 };
            case (#greater) { 1 };
          };

          let bDate : Int = switch (Text.compare(b.airedDate, "")) {
            case (#equal) { 0 };
            case (#less) { -1 };
            case (#greater) { 1 };
          };

          if (aDate != bDate) {
            if (ascending) {
              if (bDate == 0) {
                #less;
              } else if (aDate == 0) {
                #greater;
              } else {
                Int.compare(aDate, bDate);
              };
            } else {
              if (bDate == 0) {
                #greater;
              } else if (aDate == 0) {
                #less;
              } else {
                Int.compare(bDate, aDate);
              };
            };
          } else {
            if (ascending) {
              Text.compare(a.airedDate, b.airedDate);
            } else {
              Text.compare(b.airedDate, a.airedDate);
            };
          };
        };
        case (_) {
          if (ascending) {
            Text.compare(a.title, b.title);
          } else {
            Text.compare(b.title, a.title);
          };
        };
      };
    };

    animeEntries.sort(compareFunc);
  };

  public query func filterAnimeByGenres(animeEntries : [AnimeEntry], genres : [Text]) : async [AnimeEntry] {
    if (genres.size() == 0) {
      return animeEntries;
    };

    let genreList = List.fromArray(genres);

    animeEntries.filter(
      func(anime) {
        var matchesAllGenres = true;
        for (genre in genreList.toArray().vals()) {
          var hasGenre = false;
          for (animeGenre in anime.genres.vals()) {
            if (Text.equal(animeGenre, genre)) {
              hasGenre := true;
            };
          };
          if (not hasGenre) {
            matchesAllGenres := false;
          };
        };
        matchesAllGenres;
      }
    );
  };

  public type LoginAttemptInfo = {
    failedAttempts : Nat;
    lockoutUntil : Int;
  };

  let loginAttempts = Map.empty<Principal, LoginAttemptInfo>();

  public shared ({ caller }) func recordFailedLoginAttempt() : async () {
    let currentTime = Time.now();
    let attemptInfo = switch (loginAttempts.get(caller)) {
      case (null) {
        {
          failedAttempts = 1;
          lockoutUntil = 0;
        };
      };
      case (?info) {
        if (info.failedAttempts + 1 >= 5) {
          {
            failedAttempts = 5;
            lockoutUntil = currentTime + 600_000_000_000;
          };
        } else {
          {
            failedAttempts = info.failedAttempts + 1;
            lockoutUntil = 0;
          };
        };
      };
    };

    loginAttempts.add(caller, attemptInfo);
  };

  public shared ({ caller }) func resetLoginAttempts() : async () {
    loginAttempts.remove(caller);
  };

  private func clearExpiredLockout(caller : Principal) : () {
    let currentTime = Time.now();
    switch (loginAttempts.get(caller)) {
      case (null) {};
      case (?info) {
        if (info.failedAttempts >= 5 and currentTime >= info.lockoutUntil) {
          loginAttempts.remove(caller);
        };
      };
    };
  };

  public shared ({ caller }) func clearMyExpiredLockout() : async () {
    clearExpiredLockout(caller);
  };

  public query ({ caller }) func checkLoginLockout() : async Bool {
    let currentTime = Time.now();
    switch (loginAttempts.get(caller)) {
      case (null) { false };
      case (?info) {
        if (info.failedAttempts >= 5 and currentTime < info.lockoutUntil) {
          true;
        } else {
          false;
        };
      };
    };
  };

  public query ({ caller }) func getRemainingLockoutTime() : async Int {
    let currentTime = Time.now();
    switch (loginAttempts.get(caller)) {
      case (null) { 0 };
      case (?info) {
        if (info.failedAttempts >= 5 and currentTime < info.lockoutUntil) {
          info.lockoutUntil - currentTime;
        } else {
          0;
        };
      };
    };
  };

  public query ({ caller }) func filterEntriesBySynopsis(watchlistName : Text, searchText : Text) : async [WatchlistEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can filter watchlist entries");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { return [] };
      case (?watchlists) { watchlists };
    };

    let targetWatchlist = currentWatchlists.watchlists.find(func(w) { w.name == watchlistName });

    if (searchText.size() == 0) {
      switch (targetWatchlist) {
        case (null) { return [] : [WatchlistEntry] };
        case (?watchlist) { return watchlist.entries };
      };
    };

    switch (targetWatchlist) {
      case (null) { return [] : [WatchlistEntry] };
      case (?watchlist) {
        let result = watchlist.entries.filter(
          func(entry) {
            let loweredTitle = entry.anime.title.map(
              func(c) {
                if (c >= 'A' and c <= 'Z') {
                  Char.fromNat32(c.toNat32() + 32);
                } else { c };
              }
            );
            let loweredDescription = entry.anime.description.map(
              func(c) {
                if (c >= 'A' and c <= 'Z') {
                  Char.fromNat32(c.toNat32() + 32);
                } else { c };
              }
            );
            let loweredSearchText = searchText.map(
              func(c) {
                if (c >= 'A' and c <= 'Z') {
                  Char.fromNat32(c.toNat32() + 32);
                } else { c };
              }
            );

            loweredTitle.contains(#text loweredSearchText) or loweredDescription.contains(#text loweredSearchText)
          }
        );
        return result;
      };
    };
  };

  public query ({ caller }) func getWatchlistEntriesSortedByPersonalRating(watchlistName : Text, ascending : Bool) : async [WatchlistEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can sort watchlist entries");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { return [] };
      case (?watchlists) { watchlists };
    };

    let targetWatchlist = currentWatchlists.watchlists.find(func(w) { w.name == watchlistName });
    let entriesToSort = switch (targetWatchlist) {
      case (null) { [] : [WatchlistEntry] };
      case (?watchlist) { watchlist.entries };
    };

    let sortedEntries = entriesToSort.sort(
      func(a, b) {
        if (ascending) {
          Float.compare(a.personalRating, b.personalRating);
        } else {
          Float.compare(b.personalRating, a.personalRating);
        };
      }
    );
    sortedEntries;
  };

  public query ({ caller }) func getWatchlistEntriesSortedByAiredDate(watchlistName : Text, ascending : Bool) : async [WatchlistEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can sort watchlist entries");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { return [] };
      case (?watchlists) { watchlists };
    };

    let targetWatchlist = currentWatchlists.watchlists.find(func(w) { w.name == watchlistName });
    let entriesToSort = switch (targetWatchlist) {
      case (null) { [] : [WatchlistEntry] };
      case (?watchlist) { watchlist.entries };
    };

    let sortedEntries = entriesToSort.sort(
      func(a, b) {
        let aDate : Int = switch (Text.compare(a.anime.airedDate, "")) {
          case (#equal) { 0 };
          case (#less) { -1 };
          case (#greater) { 1 };
        };

        let bDate : Int = switch (Text.compare(b.anime.airedDate, "")) {
          case (#equal) { 0 };
          case (#less) { -1 };
          case (#greater) { 1 };
        };

        if (aDate != bDate) {
          if (ascending) {
            if (bDate == 0) {
              #less;
            } else if (aDate == 0) {
              #greater;
            } else {
              Int.compare(aDate, bDate);
            };
          } else {
            if (bDate == 0) {
              #greater;
            } else if (aDate == 0) {
              #less;
            } else {
              Int.compare(bDate, aDate);
            };
          };
        } else {
          if (ascending) {
            Text.compare(a.anime.airedDate, b.anime.airedDate);
          } else {
            Text.compare(b.anime.airedDate, a.anime.airedDate);
          };
        };
      }
    );

    sortedEntries;
  };

  public query ({ caller }) func getWatchlistEntriesSortedByTitle(watchlistName : Text) : async [WatchlistEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can sort watchlist entries");
    };

    let currentWatchlists = switch (userWatchlists.get(caller)) {
      case (null) { return [] };
      case (?watchlists) { watchlists };
    };

    let targetWatchlist = currentWatchlists.watchlists.find(func(w) { w.name == watchlistName });
    let entriesToSort = switch (targetWatchlist) {
      case (null) { [] : [WatchlistEntry] };
      case (?watchlist) { watchlist.entries };
    };

    let sortedEntries = entriesToSort.sort(
      func(a, b) { Text.compare(a.anime.title, b.anime.title) }
    );
    sortedEntries;
  };

  var persistentState = Map.empty<Principal, [Nat8]>();

  public shared ({ caller }) func storePersistentState(state : [Nat8]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can store persistent state");
    };
    persistentState.add(caller, state);
  };

  public query ({ caller }) func retrievePersistentState() : async ?[Nat8] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can retrieve persistent state");
    };
    persistentState.get(caller);
  };

  var persistentSystemInfo = {
    content = "";
  };

  public query ({ caller }) func getSystemInfoContent() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view system information");
    };
    persistentSystemInfo.content;
  };
};
