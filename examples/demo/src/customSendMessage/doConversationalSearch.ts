/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import { ChatInstance, GenericItem, StreamChunk } from "@carbon/ai-chat";
import { sleep } from "../framework/utils";

import { WORD_DELAY } from "./constants";

const TEXT =
  "The National Park Service (NPS) was created on August 25, 1916, by Congress through the act that established Yellowstone National Park. However, individual sites within the NPS, such as those mentioned in the document, were established at different times. For example, Jamestown, Virginia was founded in 1607, Plymouth was founded in 1620, and Independence National Historical Park was established in 1948 to preserve Independence Hall and the Liberty Bell.";

const META = {
  confidence_scores: {
    threshold: 0.35,
    pre_gen: 0.61,
    extractiveness: 0.27,
    post_gen: 0.41,
  },
  citations_title: "How do we know?",
  citations: [
    {
      title:
        "Independence National Historical Park (U.S. National Park Service)",
      text: "The park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell.",
      body: "The park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell.",
      url: "https://www.nps.gov/inde/index.htm#:~:text=%22We%20hold%20these,the%20Liberty%20Bell",
      search_result_idx: 3,
      range_start: 377,
      range_end: 456,
    },
    {
      title:
        "Frequently Asked Questions - Historic Jamestowne Part of Colonial National Historical Park (U.S. National Park Service)",
      text: 'When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
      body: 'When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
      url: "https://www.nps.gov/jame/faqs.htm#:~:text=1607",
      search_result_idx: 0,
      range_start: 269,
      range_end: 330,
    },
  ],
  response_length_option: "moderate",
  search_results: [
    {
      result_metadata: {
        collection_id: "1f9ea81f-fa84-04e4-0000-018b902c89b8",
        document_retrieval_source: "search",
        confidence: 0.03426,
      },
      url: "https://www.nps.gov/jame/faqs.htm#:~:text=1607",
      highlight: {
        body: [
          'Jamestown, Virginia was founded in <em>1607</em> whereas Plymouth was founded in 1620. Jamestown was the capital until 1699, when it moved to what is now Williamsburg. Two possible reasons for the confusion: 1. When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2.',
        ],
      },
      answers: [
        {
          text: "1607",
          confidence: 0.23277359,
        },
      ],
      body: 'Skip to global NPS navigation\nSkip to this park navigation\nSkip to the main content\nSkip to this park information section\nSkip to the footer section\n\nNational Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nHistoric Jamestowne\nPart of Colonial National Historical Park\n\nVirginia\n\nInfo\nAlerts\nMaps\nCalendar\nFees\nLoading alerts\nAlerts In Effect\n\nDismiss more information on current conditions...\n\n\nDismiss\n\nView all alerts\nContact Us\nFrequently Asked Questions\nQUESTION:\n Why choose Jamestown?\nANSWER:\n The Virginia Company, who funded everything, sent a list of criteria to use when picking a spot for the settlement and Jamestown met most of them. Jamestown was surrounded by water on three sides (it was not fully an island yet) and was far inland; both meant it was easily defensible against possible Spanish attacks. The water was also deep enough that the English could tie their ships at the shoreline - good parking! The site was also not inhabited by the local Powhatan Indians. For more information on why they chose Jamestown go here\n.\n\nQUESTION:\n Why didn\'t the English fish during the "Starving Time?"\nANSWER:\n There are several possible reasons: if the local Powhatan Indians had helped them build fishing weirs to catch fish the English were unable to repair them, plus were afraid to leave the protection of the fort at all for fear of being killed by the Powhatan Indians; the changing nature of the James River meant different types of fish were around at different times of the year; the long, severe drought impacted the number and type of fish in the river; and it could be the fact that so many were sick, they were simply too weak to do any fishing.\n\nQUESTION:\n When did the first women arrive?\nANSWER:\n The first two women arrived at Jamestown on the second resupply in 1608; Mistress Forrest and her maid servant Anne Burras. After that, more women arrived, as parts of families, but the first significant influx of women did not occur until much later. In 1619, the Virginia Company realized women were needed to establish a more permanent settlement. The company recruited and sent over 90 single women to become wives and start families. For more on the role of women at Jamestown go here\n.\n\nQUESTION:\n Wasn\'t Plymouth, Massachusetts the first permanent English settlement?\nANSWER:\n No. Jamestown, Virginia was founded in 1607 whereas Plymouth was founded in 1620. Jamestown was the capital until 1699, when it moved to what is now Williamsburg. Two possible reasons for the confusion: 1. When Jamestown was founded the Virginia Company, who funded everything, wanted a return on their investment - they wanted to make money, whereas Plymouth was founded for "religious freedom" - more specifically to escape persecution they felt for their religious beliefs in Europe; 2. The North won the Civil War, so the fact that Plymouth is in the North and Jamestown in the South makes a difference. For more on the differences between Jamestown and Plymouth look here\n.\n\nQUESTION:\n Wasn\'t Jamestown abandoned?\nANSWER:\n The short answer is no. Jamestown was almost abandoned in the spring of 1610. When survivors from the ship wrecked on Bermuda arrived, and saw the devastation after the "starving time," the decision was made to leave. However, after less than a day the ships turned around and headed back to Jamestown - after hearing news of an incoming fleet with the new Governor for life, Lord Delaware, aboard. Jamestown remained the capital until 1699, when it was moved to Williamsburg. After that several families owned and lived on Jamestown Island. Although a historic site today, there is still a private residence on the island. For more about Jamestown\'s history go here\n.\n\nQUESTION:\n Which Powhatan Indian Tribe lived closest to Jamestown?\nANSWER:\n At the time, the Paspahegh Tribe lived closest to Jamestown - their nearest town was only 4 miles away. They had used Jamestown as hunting ground, until the English came in and claimed it as theirs. Of the tribes recognized by the Commonwealth of Virginia today, the Chickahominy Tribe lives closest to Jamestown Island. More information on the Powhatan Indians can be found here\n.\n\nQUESTION:\n When did the first Africans arrive at Jamestown?\nANSWER:\n The first documented Africans, "20 and Odd", arrived in Virginia in 1619. The question as to whether these people were enslaved or indentured servants has been studied for many years, with various answers. For more information on the Africans in Jamestown check out the documents here and here\n.\n\nQUESTION:\n Why is it called the Pitch and Tar Swamp?\nANSWER:\n Pitch and tar can be found in pine trees. The English attempted to extract the pitch and tar from the pine trees found in swampy Jamestown, hence the name "Pitch and Tar Swamp." They used the pitch, tar, and the pine trees themselves to build ships.\n\nQUESTION:\n Why do you fly the Union Jack flag?\nANSWER:\n The flag you see is not the Union Jack of present day Great Britain; it is a predecessor to it. See our "History of the British Flag" here for more information on the transformation of the flag over the years.\n\nQUESTION:\n My ancestor lived in Jamestown, do you have resources I could look at to help me find more information?\nANSWER:\n Unfortunately, we do not do genealogical research at Historic Jamestowne and have very little resources on site. Our genealogical fact sheet here could help in your search.\nLast updated: September 18, 2015\nPark footer\nContact Info\nMailing Address:\n\nP.O. Box 210\n\n\nYorktown,\n\n\nVA\n\n\n23690\n\nPhone:\n757 898-2410\n\nContact Us\n\nTools\nFAQ\nSite Index\nEspaol\nStay Connected\n\nThis Site\n\n\nAll NPS\n\nDownload the official NPS app before your next visit\nNational Park Service\nU.S. Department of the Interior\n\nAccessibility\n\n\nPrivacy Policy\n\n\nFOIA\n\n\nNotices\n\n\nContact The National Park Service\n\n\nNPS FAQ\n\n\nNo Fear Act\n\n\nDisclaimer\n\n\nVulnerability Disclosure Policy\n\n\nUSA.gov\n\nFacebook\nYoutube\nTwitter\nInstagram\nFlickr\n',
      title:
        "Frequently Asked Questions - Historic Jamestowne Part of Colonial National Historical Park (U.S. National Park Service)",
      id: "web_crawl_91517d59-b7fd-54fa-9615-91fa63f9f754",
    },
    {
      result_metadata: {
        collection_id: "1f9ea81f-fa84-04e4-0000-018b902c89b8",
        document_retrieval_source: "search",
        confidence: 0.00982,
      },
      url: "https://www.nps.gov/subjects/heritagetravel/discover-our-shared-heritage.htm#:~:text=National%20Park%20Service%0A%0ASearch%0A%0ASearch%0A%0A%0AThis,our%20Shared%20Heritage",
      highlight: {
        body: [
          "Skip to global NPS navigation\nSkip to the main content\nSkip to the footer section\n\n<em>National Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nHeritage Travel\nContact Us\nDiscover our Shared Heritage</em>\nLooking for adventure?",
        ],
      },
      answers: [
        {
          text: "National Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nHeritage Travel\nContact Us\nDiscover our Shared Heritage",
          confidence: 0.058678728,
        },
      ],
      body: "Skip to global NPS navigation\nSkip to the main content\nSkip to the footer section\n\nNational Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nHeritage Travel\nContact Us\nDiscover our Shared Heritage\nLooking for adventure? Want to spark your curiosity and learn about other places?  \nDiscover Our Shared Heritage through travel Itineraries below to take a virtual trip or plan some travel. Explore our Curiosity Kick-Start and Curiosity Kits to dive into place! \nMany Discover our Shared Heritage Travel Itineraries have been produced in partnership with the National Conference of State Historic Preservation Officers (NCSHPO) and various state and local organizations. Each itinerary features places managed by the National Park Service or listed in the \nNational Register of Historic Places\n. \nExplore \"place\" with these resources:\nCuriosity Kick-Start \nUse this guide to kick-start your curiosity about a place. Consider why the place has meaning and how it connects to the bigger picture. \nCuriosity Kits \nThese multi-piece tools explore topics in US history, from Black cowpokes to women aviators. Learn about historic places across the country.\n\nTravel Itineraries:\nTravel Where Women Made History \nDiscover historic places associated with ordinary and extraordinary American women. Find places in all US states and territories. \nTravel Omaha, Nebraska\nDiscover the stories, places, and themes of Omaha, Nebraskas fascinating history since its founding in 1854.\nMore Travel itineraries\nIowa \n\nTravel the Amana Colonies\n\nExplore the stories, places, and the people of the Amana Colonies - an American Utopia.\nFind places in every state! \n\nTravel America's Diverse Cultures\n\nDiscover places associated with cultural, ethnic, and religious diversity, hallmarks of American society. \nConnecticut \n\nTravel the Amistad Story\n\nDiscover the story of the Amistada, a Spanish schooner taken over by a group of captured Africans seeking to escape impending slavery.\n\nTravel Ashland, OR\n\nExplore the sites of historic Ashland and learn about its hot springs that were historically used for healing and relaxation. \n\nTravel AAPI Heritage\n\nAsian and Pacific Islander peoples have played a profoundly important role in American history. Find places in PA, UT, HI, NY, AK and more!\nOH, MN, VA, KA, IN, FL, NC and more!\n\nTravel Sites of Aviation\n\nVisit sites of American aviation and flight. \nMaryland \n\nTravel Baltimore, Maryland\n\nTravel historic Baltimore, a city founded on a harbor, and discover how water travel shaped our nations history.\nSouth Carolina\n\nTravel Charleston, SC\n\nExplore this historic city located on a peninsula where the Ashley and Cooper Rivers meet and discover stories of resilience & freedom. \n\nTravel Chicago, Illinois\n\nExplore places in Chicago to learn about the people and places that make this metropolis unique.\nMichigan\n\nTravel Detroit, Michigan\n\nTravel historic sites of Detroit and learn about the city's music history. \nAmerican Southwest\n\nTravel El Camino Real\n\nEl Camino Real tracks a settlement story that emphasizes the the shared history and heritage of Spain, Mexico and the American Southwest.\nFlorida\n\nTravel Florida Shipwrecks\n\nDelve beneath the waves to explore Florida's shipwrecks and their hidden histories. \nAZ, CA, CO, ID, MT, NV, NM and more!\n\nTravel Historic Water Projects\n\nExplore sites of the Bureau of Reclamation, the nation's largest supplier of water.  \nVirginia \n\nTravel James River, Virginia\n\nFor thousands of years the James River has been important to the people living in Virginia. Learn more about the places along this river. \nIL, MO, KA, IA, NE, SD, ND and more!\n\nTravel the Lewis and Clark Expedition\n\nExplore the places Lewis & Clark passed on their expedition. Their voyage covered more than 8,000 miles in less than two-and-a-half years.\n\nTravel Massachusetts Conservation\n\nLearn about the American conservation story through the protected landscapes that are featured in the itinerary. \n\nTravel Omaha, Nebraska\n\nDiscover the stories, places, and themes of Omaha, Nebraskas fascinating history since its founding in 1854.\n\nTravel Route 66\n\nExplore this historic roadway across the western United States and discover iconic filling stations, hotels, and restaurants.\n\nWWII in the San Francisco Bay Area\n\nTravel places associated with San Francisco's role in building ships and providing supplies for soldiers fighting in World War II. \nCalifornia \n\nTravel Santa Clara County, California\n\nThe region of Santa Clara is internationally known for its technology achievements. It also boasts beautiful parks and open spaces. \nME, NH. MA, OH, KY, and NY\n\nTravel the Shaker Historic Trail\n\nExplore stories, places, and the people of American Shaker Communities.\nAZ, NM, and TX \n\nSpanish Missions/Misiones Espaolas\n\nJourney to historic places to explore the stories and legacies of the Spanish Colonial missions. \nWI, OH, ME, TN, CA, SD, NY and more!\n\nTravel VA Homes for Disabled Soldiers\n\nDiscover 11 branches of the National Home for Disabled Volunteer Soldiers and visit historic buildings and landscapes. \n\nTravel Washington, DC\n\nWashington, DC, has engaging stories to tell about the people and places that have helped shape the Nation. \nFind places across the US! \n\nTravel We Shall Overcome\n\nDiscover places that tell the story of the Civil Rights Movement. \n\nTravel Where Women Made History\n\nDiscover historic places associated with ordinary and extraordinary American women. Find places in all US states and territories. \n\nTravel World Heritage Sites\n\nThis itinerary offers a glimpse of U.S. World Heritage Sites, revealing why they have been identified as having such universal significance.\nExplore Older Itineraries:\nAboard the Underground Railroad\nAmerican Latino Heritage\nAmerican Presidents\nAmerican Southwest\nEarly History of the California Coast\nCentral Vermont\nCivil War Era National Cemeteries: Honoring Those Who Served\nAlong the Georgia-Florida Coast\nMaritime History of Massachusetts\nLexington, Kentucky\nIndian Mounds of Mississippi\nPuerto Rico and the Virgin Islands\nRaleigh, NC\nShelby, North Carolina\nVirginia Main Street Communities\nLegacy Itineraries\nLast updated: October 10, 2023\nTools\n Site Index\n Contact Us\n\nThis Site\n\n\nAll NPS\n\nDownload the official NPS app before your next visit\nNational Park Service\nU.S. Department of the Interior\n\nAccessibility\n\n\nPrivacy Policy\n\n\nFOIA\n\n\nNotices\n\n\nContact The National Park Service\n\n\nNPS FAQ\n\n\nNo Fear Act\n\n\nDisclaimer\n\n\nVulnerability Disclosure Policy\n\n\nUSA.gov\n\nFacebook\nYoutube\nTwitter\nInstagram\nFlickr\n",
      title:
        "Discover our Shared Heritage - Heritage Travel (U.S. National Park Service)",
      id: "web_crawl_03ba4173-6867-5304-bb66-d3f47ec5fda9",
    },
    {
      result_metadata: {
        collection_id: "1f9ea81f-fa84-04e4-0000-018b902c89b8",
        document_retrieval_source: "search",
        confidence: 0.00938,
      },
      url: "https://www.nps.gov/subjects/africanamericanheritage/about.htm#:~:text=January%2029%2C%202019",
      highlight: {
        body: [
          "Phenomenal Women\n\nWomen\n\nDiscover the national parks that share the remarkable lives of African American women who shaped history. \nLast updated: <em>January 29, 2019</em>\nTools\nCalendar\n Teachers\n Site Index\n\nThis Site\n\n\nAll NPS\n\nDownload the official NPS app before your next visit\nNational Park Service\nU.S. Department of the Interior\n\nAccessibility\n\n\nPrivacy Policy\n\n\nFOIA\n\n\nNotices\n\n\nContact The National Park Service\n\n\nNPS FAQ\n\n\nNo Fear Act\n\n\nDisclaimer",
        ],
      },
      answers: [
        {
          text: "January 29, 2019",
          confidence: 0.056347836,
        },
      ],
      body: "Skip to global NPS navigation\nSkip to the main content\nSkip to the footer section\n\nNational Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nAfrican American Heritage\nContact Us\nAbout\n\nExplore these topics related to African American Heritage.\n\nWho We Are\n\nArts, Culture, Family & Religion\n\nExpressions of culture, family and religion form the core of the African American experience in America.  \nDemanding Equal Rights\n\nCivil Rights\n\nLearn more about African American's struggles for civil rights from America's origins to the modern Civil Rights movement.\nBack in Business\n\nEconomy & Industry\n\nAfrican Americans transformed the economic world, started businesses and industries, and left their mark.\nLeading the Way\n\nEducation & Schools\n\nExplore textbook examples of African Americans overcoming racism by founding their own schools and desegregating public schools.\nRighting the Original Wrong\n\nEnslavement & Abolition\n\nLearn about the enslavement of African Americans and the efforts of those who struggled for generations to abolish this \"lamentable\" evil.\nProud to Serve\n\nAfrican American Military Heritage\n\nAfrican Americans have served with distinction in the American military since its founding, despite overwhelming racism and challenges.\nExploring the world around them\n\nScience, Technology & Invention\n\nExplore the lives of those who looked at the world around them and saw something new!\nPhenomenal Women\n\nWomen\n\nDiscover the national parks that share the remarkable lives of African American women who shaped history. \nLast updated: January 29, 2019\nTools\nCalendar\n Teachers\n Site Index\n\nThis Site\n\n\nAll NPS\n\nDownload the official NPS app before your next visit\nNational Park Service\nU.S. Department of the Interior\n\nAccessibility\n\n\nPrivacy Policy\n\n\nFOIA\n\n\nNotices\n\n\nContact The National Park Service\n\n\nNPS FAQ\n\n\nNo Fear Act\n\n\nDisclaimer\n\n\nVulnerability Disclosure Policy\n\n\nUSA.gov\n\nFacebook\nYoutube\nTwitter\nInstagram\nFlickr\n",
      title: "About - African American Heritage (U.S. National Park Service)",
      id: "web_crawl_e085238a-7a1a-5ee5-b0f5-924e6f28acf8",
    },
    {
      result_metadata: {
        collection_id: "1f9ea81f-fa84-04e4-0000-018b902c89b8",
        document_retrieval_source: "search",
        confidence: 0.00914,
      },
      url: "https://www.nps.gov/inde/index.htm#:~:text=%22We%20hold%20these,the%20Liberty%20Bell",
      highlight: {
        body: [
          'more information on current conditions...\n\n\nDismiss\n\nView all alerts\nContact Us\n<em>"We hold these Truths to be self-evident, that all Men are created equal..."\nThe park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell</em>.',
        ],
      },
      answers: [
        {
          text: '"We hold these Truths to be self-evident, that all Men are created equal..."\nThe park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell',
          confidence: 0.07042525,
        },
      ],
      body: "Skip to global NPS navigation\nSkip to this park navigation\nSkip to the main content\nSkip to this park information section\nSkip to the footer section\n\nNational Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nIndependence\nNational Historical Park\n\nPennsylvania\n\nInfo\nAlerts\nMaps\nCalendar\nFees\nLoading alerts\nAlerts In Effect\n\nDismiss more information on current conditions...\n\n\nDismiss\n\nView all alerts\nContact Us\n\"We hold these Truths to be self-evident, that all Men are created equal...\"\nThe park represents the founding ideals of the nation, and preserves national and international symbols of freedom and democracy, including Independence Hall and the Liberty Bell. The Declaration of Independence and U.S. Constitution were both debated and signed inside Independence Hall, a UNESCO World Heritage Site. \nVisiting the Liberty Bell Center\nNo tickets are needed to see this international symbol of liberty. \nVisiting Independence Hall\nEntrance is by tour only. Tickets are required.\nBenjamin Franklin Museum\nExplore a state-of-the-art museum honoring Philadelphia's own Benjamin Franklin.\nVideos\nDive into the park's sites and stories with these videos.\nHistory and Culture\nLooking for the history of Independence Hall or the story of the Liberty Bell?  We've got that!\nLast updated: September 22, 2023\n\nMORE TO EXPLORE\n\nHear the Liberty Bell\nWhat Did it Sound Like?\nLearn at Home or School\nJunior Ranger Challenge\nOne app, every park\nGet the FREE NPS App Now!\nRead A Day-By-Day Account\nThe Constitutional Convention\nPark footer\nContact Info\nMailing Address:\n\n143 S. 3rd Street\n\n\nPhiladelphia,\n\n\nPA\n\n\n19106\n\nPhone:\n215-965-2305\n\nContact Us\n\nTools\nFAQ\nSite Index\nEspaol\nStay Connected\n\nThis Site\n\n\nAll NPS\n\nDownload the official NPS app before your next visit\nNational Park Service\nU.S. Department of the Interior\n\nAccessibility\n\n\nPrivacy Policy\n\n\nFOIA\n\n\nNotices\n\n\nContact The National Park Service\n\n\nNPS FAQ\n\n\nNo Fear Act\n\n\nDisclaimer\n\n\nVulnerability Disclosure Policy\n\n\nUSA.gov\n\nFacebook\nYoutube\nTwitter\nInstagram\nFlickr\n",
      title:
        "Independence National Historical Park (U.S. National Park Service)",
      id: "web_crawl_a6338ca7-3a56-594a-9a49-92bdf9e2827f",
    },
    {
      result_metadata: {
        collection_id: "1f9ea81f-fa84-04e4-0000-018b902c89b8",
        document_retrieval_source: "search",
        confidence: 0.00846,
      },
      url: "https://www.nps.gov/subjects/americanrevolution/visit.htm#:~:text=The%20following%20parks,the%20American%20Revolution",
      highlight: {
        body: [
          "Overmountain Victory NHT\nParks About the Revolution\n<em>The following parks exist, in full or in part, to preserve stories and places associated with the American Revolution</em>.\nDiscover an American Founding Father\nCharles Pinckney National Historic Site\nHistory Come to Life\nFort Stanwix National Monument\nGeorge Rogers Clark NHP\nWalking in Washington's Footsteps\nGeorge Washington Birthplace NM\nA Founding Fathers Harlem Home\nHamilton Grange National Memorial",
        ],
      },
      answers: [
        {
          text: "The following parks exist, in full or in part, to preserve stories and places associated with the American Revolution",
          confidence: 0.078093424,
        },
      ],
      body: 'Skip to global NPS navigation\nSkip to the main content\nSkip to the footer section\n\nNational Park Service\n\nSearch\n\nSearch\n\n\nThis Site\n\n\nAll NPS\n\nOpen\n\nMenu\n\n\nClose\n\nMenu\n\nExplore This Park\n\n\nExplore the National Park Service\n\nExiting nps.gov\nCancel\nAmerican Revolution\nContact Us\nVisit\nMany places where the Revolution happened can be visited today. Walk into the room where the Declaration was approved and signed. Stand where the Kings Mountain loyalists were trapped and imagine being surrounded by an enemy army. Visit the home that Abigail Adams ran while John was in Congress and where she wrote him about events in New England. Imagine yourself a British soldier under siege on the Yorktown peninsula. \nSearch through the entire National Park System for a park near you!\n\nThe National Park Service, state park authorities, and others maintain these and many other historic sites for the benefit of you and future generations.\n\nReady to go? Get your pass! The \nNational Parks and Federal Recreational Lands Pass Series includes several passes that cover entrance fees at national parks.\nBattlefields of the War\nCheck out a few of the parks that exist partly or entirely to preserve battlefields of the war. \n"The Road To Revolution"\nA Revolution begins - A Nation is born.\nRevolution in the Minds and Hearts \nBoston National Historical Park \nThe Turning Point\nSaratoga National Historical Park \nGeorge Rogers Clark NHP\nWinning Americas Independence\nYorktown Battlefield \nThe Southern Campaign\nThese parks preserve stories and places associated with the Southern Campaign of the American Revolutionary War.\nTurn of the tide of success\nKings Mountain National Military Park\n"...Our success was complete..."\nCowpens National Battlefield\n2.5 hour battle changes America\nGuilford Courthouse NMP\nDiscover the 18th Century of SC\nNinety Six National Historic Site\nDrive, Hike, and Bike with Patriots!\nOvermountain Victory NHT\nParks About the Revolution\nThe following parks exist, in full or in part, to preserve stories and places associated with the American Revolution.\nDiscover an American Founding Father\nCharles Pinckney National Historic Site\nHistory Come to Life\nFort Stanwix National Monument\nGeorge Rogers Clark NHP\nWalking in Washington\'s Footsteps\nGeorge Washington Birthplace NM\nA Founding Fathers Harlem Home\nHamilton Grange National Memorial \nHow American Industrialization Began\nHopewell Furnace National Historic Site \nWe the People of the United States\nIndependence National Historical Park\nLiterature & Leadership\nLongfellow House-Washington\'s HQ NHS\nA River and Its History\nLower Delaware NS & WR\n"The Road To Revolution"\nA Revolution begins - A Nation is born.\nWhere America Survived\nMorristown National Historical Park \nPrince William Forest Park\nThe Turning Point\nSaratoga National Historical Park \nForging Arms for the Nation\nSpringfield Armory NHS\nChampion of Human Rights\nThaddeus Kosciuszko National Memorial\nDifficult Choices\nThomas Stone National Historic Site\nDetermined to Persevere\nValley Forge National Historical Park \nLast updated: December 1, 2022\nTools\nCalendar\n Site Index\n\nThis Site\n\n\nAll NPS\n\nDownload the official NPS app before your next visit\nNational Park Service\nU.S. Department of the Interior\n\nAccessibility\n\n\nPrivacy Policy\n\n\nFOIA\n\n\nNotices\n\n\nContact The National Park Service\n\n\nNPS FAQ\n\n\nNo Fear Act\n\n\nDisclaimer\n\n\nVulnerability Disclosure Policy\n\n\nUSA.gov\n\nFacebook\nYoutube\nTwitter\nInstagram\nFlickr\n',
      title: "Visit - American Revolution (U.S. National Park Service)",
      id: "web_crawl_9890b5f6-067b-5d19-b79f-9b36ba0cb423",
    },
  ],
  disclaimer: "Accuracy of generated answers may vary.",
};

function doConversationalSearch(instance: ChatInstance) {
  const response = {
    response_type: "conversational_search",
    text: TEXT,
    ...META,
  };

  instance.messaging.addMessage({
    output: {
      generic: [response as GenericItem],
    },
  });
}

async function doConversationalSearchStreaming(
  instance: ChatInstance,
  text: string = TEXT
) {
  const responseID = crypto.randomUUID();
  const words = text.split(" ");

  words.forEach((word, index) => {
    setTimeout(() => {
      // Each time you get a chunk back, you can call `addMessageChunk`.
      instance.messaging.addMessageChunk({
        partial_item: {
          response_type: "conversational_search",
          // The next chunk, the chat component will deal with appending these chunks.
          text: `${word} `,
          streaming_metadata: {
            // This is the id of the item inside the response. If you have multiple items in this message they will be
            // ordered in the view in the order of the first message chunk received. If you want message item 1 to
            // appear above message item 2, be sure to seed it with a chunk first, even if its empty to start.
            id: "1",
          },
        } as unknown as GenericItem,
        streaming_metadata: {
          // This is the id of the entire message response.
          response_id: responseID,
        },
      });
    }, index * WORD_DELAY);
  });

  await sleep((words.length + 1) * WORD_DELAY);

  // When you are done streaming this item in the response, you should call the complete item.
  // This requires ALL the concatenated final text. If you want to append text, run a post processing safety check, or anything
  // else that mutates the data, you can do so here.
  const completeItem = {
    response_type: "conversational_search",
    text,
    ...META,
    streaming_metadata: {
      // This is the id of the item inside the response.
      id: "1",
    },
  };
  instance.messaging.addMessageChunk({
    complete_item: completeItem,
    streaming_metadata: {
      // This is the id of the entire message response.
      response_id: responseID,
    },
  } as StreamChunk);

  // When all and any chunks are complete, you send a final response.
  // You can rearrange or re-write everything here, but what you send here is what the chat will display when streaming
  // has been completed.
  const finalResponse = {
    id: responseID,
    output: {
      generic: [completeItem],
    },
  };

  await instance.messaging.addMessageChunk({
    final_response: finalResponse,
  } as StreamChunk);
}

export { doConversationalSearch, doConversationalSearchStreaming };
