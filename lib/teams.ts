// World Cup 2026 — Effectifs + cotes de base par joueur
// Ordre : attaquants d'abord (cotes basses), milieux offensifs après (cotes hautes)

export const ROSTERS: Record<string, string[]> = {
  France: ["Kylian Mbappé", "Antoine Griezmann", "Ousmane Dembélé", "Marcus Thuram", "Randal Kolo Muani", "Bradley Barcola", "Kingsley Coman", "Adrien Rabiot"],
  Argentina: ["Lionel Messi", "Julián Álvarez", "Lautaro Martínez", "Paulo Dybala", "Ángel Di María", "Nicolás González", "Alejandro Garnacho", "Exequiel Palacios"],
  Brazil: ["Vinícius Júnior", "Rodrygo", "Endrick", "Raphinha", "Gabriel Martinelli", "Savinho", "Antony", "Lucas Paquetá"],
  England: ["Harry Kane", "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Cole Palmer", "Ollie Watkins", "Marcus Rashford", "Jarrod Bowen"],
  Spain: ["Lamine Yamal", "Nico Williams", "Álvaro Morata", "Dani Olmo", "Mikel Oyarzabal", "Ferran Torres", "Pedri", "Fabián Ruiz"],
  Portugal: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leão", "Gonçalo Ramos", "Bernardo Silva", "Diogo Jota", "João Félix", "Rúben Neves"],
  Germany: ["Kai Havertz", "Jamal Musiala", "Florian Wirtz", "Niclas Füllkrug", "Leroy Sané", "Thomas Müller", "Serge Gnabry", "Ilkay Gündogan"],
  Netherlands: ["Cody Gakpo", "Memphis Depay", "Donyell Malen", "Xavi Simons", "Wout Weghorst", "Steven Bergwijn", "Brian Brobbey", "Tijjani Reijnders"],
  Italy: ["Mateo Retegui", "Federico Chiesa", "Giacomo Raspadori", "Moise Kean", "Lorenzo Pellegrini", "Davide Frattesi", "Nicolò Zaniolo", "Sandro Tonali"],
  Belgium: ["Romelu Lukaku", "Jérémy Doku", "Loïs Openda", "Charles De Ketelaere", "Kevin De Bruyne", "Leandro Trossard", "Yannick Carrasco", "Johan Bakayoko"],
  Croatia: ["Andrej Kramarić", "Bruno Petković", "Ivan Perišić", "Ante Budimir", "Luka Modrić", "Lovro Majer", "Mateo Kovačić", "Nikola Vlašić"],
  Uruguay: ["Darwin Núñez", "Facundo Pellistri", "Maximiliano Araújo", "Brian Rodríguez", "Federico Valverde", "Giorgian De Arrascaeta", "Luis Suárez", "Rodrigo Bentancur"],
  Mexico: ["Santiago Giménez", "Julián Quiñones", "Raúl Jiménez", "Hirving Lozano", "Alexis Vega", "Orbelín Pineda", "Roberto Alvarado", "Edson Álvarez"],
  Morocco: ["Youssef En-Nesyri", "Ayoub El Kaabi", "Sofiane Boufal", "Hakim Ziyech", "Brahim Díaz", "Achraf Hakimi", "Abde Ezzalzouli", "Ilias Chair"],
  Senegal: ["Sadio Mané", "Nicolas Jackson", "Boulaye Dia", "Ismaïla Sarr", "Habib Diallo", "Iliman Ndiaye", "Lamine Camara", "Pape Gueye"],
  Japan: ["Takefusa Kubo", "Kaoru Mitoma", "Ayase Ueda", "Daizen Maeda", "Takumi Minamino", "Ritsu Dōan", "Junya Ito", "Ao Tanaka"],
  "United States": ["Christian Pulisic", "Folarin Balogun", "Haji Wright", "Timothy Weah", "Giovanni Reyna", "Ricardo Pepi", "Josh Sargent", "Brenden Aaronson"],
  USA: ["Christian Pulisic", "Folarin Balogun", "Haji Wright", "Timothy Weah", "Giovanni Reyna", "Ricardo Pepi", "Josh Sargent", "Brenden Aaronson"],
  "South Korea": ["Son Heung-min", "Hwang Hee-chan", "Cho Gue-sung", "Lee Kang-in", "Oh Hyeon-gyu", "Jeong Woo-yeong", "Hwang In-beom", "Lee Jae-sung"],
  "Korea Republic": ["Son Heung-min", "Hwang Hee-chan", "Cho Gue-sung", "Lee Kang-in", "Oh Hyeon-gyu", "Jeong Woo-yeong", "Hwang In-beom", "Lee Jae-sung"],
  Canada: ["Jonathan David", "Cyle Larin", "Tajon Buchanan", "Iké Ugbo", "Alphonso Davies", "Jonathan Osorio", "Lucas Cavallini", "Liam Millar"],
  Ecuador: ["Enner Valencia", "Kendry Páez", "Gonzalo Plata", "Jhoanner Chávez", "Ángel Mena", "Kevin Rodríguez", "Jeremy Sarmiento", "Djorkaeff Reasco"],
  Denmark: ["Rasmus Højlund", "Jonas Wind", "Kasper Dolberg", "Yussuf Poulsen", "Andreas Skov Olsen", "Mikkel Damsgaard", "Pierre-Emile Højbjerg", "Christian Eriksen"],
  Switzerland: ["Breel Embolo", "Zeki Amdouni", "Noah Okafor", "Ruben Vargas", "Dan Ndoye", "Xherdan Shaqiri", "Fabian Rieder", "Michel Aebischer"],
  Serbia: ["Dušan Vlahović", "Aleksandar Mitrović", "Luka Jović", "Filip Kostić", "Dušan Tadić", "Andrija Živković", "Nemanja Maksimović", "Sergej Milinković-Savić"],
  Poland: ["Robert Lewandowski", "Karol Świderski", "Arkadiusz Milik", "Sebastian Szymański", "Piotr Zieliński", "Jakub Moder", "Kacper Urbański", "Bartosz Slisz"],
  Austria: ["Marko Arnautović", "Michael Gregoritsch", "Marcel Sabitzer", "Christoph Baumgartner", "Konrad Laimer", "Saša Kalajdžić", "Florian Grillitsch", "Nicolas Seiwald"],
  Hungary: ["Dominik Szoboszlai", "Barnabás Varga", "Roland Sallai", "Martin Ádám", "Dániel Gazdag", "Kevin Csoboth", "Callum Styles", "Ádám Lang"],
  Czechia: ["Patrik Schick", "Adam Hložek", "Mojmír Chytil", "Jan Kuchta", "Tomáš Souček", "Václav Černý", "Lukáš Provod", "Ondřej Lingr"],
  Greece: ["Vangelis Pavlidis", "Anastasios Douvikas", "Giorgos Giakoumakis", "Fotis Ioannidis", "Giorgos Masouras", "Christos Tzolis", "Petros Mantalos", "Kostas Fortounis"],
  Norway: ["Erling Haaland", "Alexander Sørloth", "Jørgen Strand Larsen", "Antonio Nusa", "Martin Ødegaard", "Oscar Bobb", "Fredrik Aursnes", "Morten Thorsby"],
  Sweden: ["Viktor Gyökeres", "Alexander Isak", "Dejan Kulusevski", "Anthony Elanga", "Emil Forsberg", "Viktor Claesson", "Mattias Svanberg", "Viktor Nilsson Lindelöf"],
  Turkey: ["Kenan Yıldız", "Arda Güler", "Kerem Aktürkoğlu", "Barış Alper Yılmaz", "Cenk Tosun", "Hakan Çalhanoğlu", "Samet Akaydın", "Orkun Kökçü"],
  Ukraine: ["Artem Dovbyk", "Mykhaylo Mudryk", "Roman Yaremchuk", "Viktor Tsyhankov", "Andriy Yarmolenko", "Oleksandr Zinchenko", "Mykola Shaparenko", "Georgiy Sudakov"],
  Romania: ["Denis Drăguş", "George Puşcaş", "Florinel Coman", "Valentin Mihăilă", "Denis Alibec", "Nicolae Stanciu", "Ianis Hagi", "Răzvan Marin"],
  Scotland: ["Lawrence Shankland", "Ché Adams", "Scott McTominay", "John McGinn", "Ryan Christie", "Lewis Ferguson", "Kenny McLean", "Stuart Armstrong"],
  Cameroon: ["Bryan Mbeumo", "Eric Maxim Choupo-Moting", "Vincent Aboubakar", "Karl Toko Ekambi", "Faris Moumbagna", "Georges-Kévin Nkoudou", "Olivier Ntcham", "André-Frank Zambo Anguissa"],
  Ghana: ["Mohammed Kudus", "Iñaki Williams", "Antoine Semenyo", "Ernest Nuamah", "Jordan Ayew", "André Ayew", "Daniel-Kofi Kyereh", "Kamaldeen Sulemana"],
  Nigeria: ["Victor Osimhen", "Ademola Lookman", "Victor Boniface", "Samuel Chukwueze", "Kelechi Iheanacho", "Terem Moffi", "Fisayo Dele-Bashiru", "Wilfred Ndidi"],
  Algeria: ["Riyad Mahrez", "Amine Gouiri", "Saïd Benrahma", "Baghdad Bounedjah", "Islam Slimani", "Youcef Belaïli", "Adem Zorgane", "Hicham Boudaoui"],
  "Ivory Coast": ["Sébastien Haller", "Simon Adingra", "Jonathan Bamba", "Oumar Diakité", "Nicolas Pépé", "Jean-Philippe Krasso", "Franck Kessié", "Seko Fofana"],
  Egypt: ["Mohamed Salah", "Omar Marmoush", "Mostafa Mohamed", "Mahmoud Trezeguet", "Ahmed Hassan Kouka", "Trézéguet", "Zizo", "Amr El Solia"],
  Tunisia: ["Issam Jebali", "Youssef Msakni", "Wahbi Khazri", "Naïm Sliti", "Anis Ben Slimane", "Haythem Jouini", "Taha Yassine Khenissi", "Seifeddine Jaziri"],
  "Saudi Arabia": ["Firas Al-Buraikan", "Salem Al-Dawsari", "Saleh Al-Shehri", "Abdullah Al-Hamdan", "Abdulrahman Ghareeb", "Sami Al-Najei", "Haitham Asiri", "Mohamed Kanno"],
  Qatar: ["Almoez Ali", "Akram Afif", "Mohammed Muntari", "Hassan Al-Haydos", "Yusuf Abdurisag", "Ahmed Alaaeldin", "Ismaeel Mohammad", "Abdullah Al-Ahrak"],
  Iran: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh", "Karim Ansarifard", "Mehdi Ghayedi", "Shahriyar Moghanlou", "Saman Ghoddos", "Ali Gholizadeh"],
  Australia: ["Mitchell Duke", "Kusini Yengi", "Craig Goodwin", "Mathew Leckie", "Brandon Borrello", "Nestory Irankunda", "Martin Boyle", "Ajdin Hrustic"],
  Colombia: ["Luis Díaz", "Jhon Durán", "Rafael Santos Borré", "James Rodríguez", "Jhon Arias", "Luis Sinisterra", "Cucho Hernández", "Eder Militão"],
  Chile: ["Alexis Sánchez", "Víctor Dávila", "Ben Brereton Díaz", "Darío Osorio", "Eduardo Vargas", "Diego Valdés", "Alexis Mac Allister", "Charles Aránguiz"],
  Peru: ["Gianluca Lapadula", "André Carrillo", "Bryan Reyna", "Edison Flores", "Paolo Guerrero", "Franco Zanelatto", "Sergio Peña", "Raziel García"],
  Venezuela: ["Salomón Rondón", "Josef Martínez", "Yeferson Soteldo", "Darwin Machís", "Jhonder Cádiz", "Eric Ramírez", "Jan Hurtado", "Rómulo Otero"],
  Jamaica: ["Leon Bailey", "Michail Antonio", "Shamar Nicholson", "Demarai Gray", "Bobby De Cordova-Reid", "Cory Burke", "Kasey Palmer", "Ethan Pinnock"],
  "Costa Rica": ["Joel Campbell", "Manfred Ugalde", "Anthony Contreras", "Jewison Bennette", "Álvaro Zamora", "Ariel Lassiter", "Orlando Galo", "Celso Borges"],
  Panama: ["Ismael Díaz", "José Fajardo", "Édgar Bárcenas", "Alfredo Stephens", "Cecilio Waterman", "Yoel Bárcenas", "Adalberto Carrasquilla", "Éric Davis"],
  Honduras: ["Luis Palma", "Alberth Elis", "Anthony Lozano", "Rubilio Castillo", "Jorge Benguché", "Choco Lozano", "Romell Quioto", "Kervin Arriaga"],
  China: ["Wu Lei", "Zhang Yuning", "Wei Shihao", "Cao Yunding", "Xie Wenneng", "Tan Long", "Liu Binbin", "Fei Nanduo"],
  Iraq: ["Aymen Hussein", "Ali Jasim", "Mohanad Ali", "Bashar Resan", "Zidane Iqbal", "Amir Al-Ammari", "Amjad Attwan", "Ali Adnan"],
}

// ---------------------------------------------------------------------------
// Cotes de base par joueur (anytime scorer, sans modificateur match)
// Plus c'est bas, plus le joueur est susceptible de marquer.
// ---------------------------------------------------------------------------
//  Tier 1 : 2.0 – 3.2  (meilleurs buteurs du monde)
//  Tier 2 : 3.2 – 5.0  (attaquants réguliers en sélection)
//  Tier 3 : 5.0 – 7.5  (ailiers / 2e attaquants)
//  Tier 4 : 7.5 – 13.0 (milieux offensifs / rôles variés)

export const PLAYER_BASE_ODDS: Record<string, number> = {
  // Tier 1
  "Erling Haaland": 2.0,
  "Kylian Mbappé": 2.2,
  "Mohamed Salah": 2.4,
  "Harry Kane": 2.3,
  "Victor Osimhen": 2.5,
  "Darwin Núñez": 2.6,
  "Lionel Messi": 2.8,
  "Robert Lewandowski": 2.5,
  "Cristiano Ronaldo": 2.8,
  "Viktor Gyökeres": 2.6,
  "Alexander Isak": 2.8,
  "Romelu Lukaku": 2.7,
  "Jonathan David": 2.6,
  "Santiago Giménez": 2.8,
  "Mateo Retegui": 3.0,
  "Artem Dovbyk": 2.9,
  "Dušan Vlahović": 2.8,
  "Lautaro Martínez": 2.9,
  "Julián Álvarez": 3.0,
  // Tier 2
  "Antoine Griezmann": 3.3,
  "Vinícius Júnior": 3.2,
  "Son Heung-min": 3.2,
  "Sadio Mané": 3.4,
  "Kai Havertz": 3.3,
  "Youssef En-Nesyri": 3.2,
  "Cody Gakpo": 3.5,
  "Marcus Thuram": 3.6,
  "Bukayo Saka": 3.5,
  "Phil Foden": 3.6,
  "Ousmane Dembélé": 3.8,
  "Endrick": 3.5,
  "Rodrygo": 3.8,
  "Omar Marmoush": 3.5,
  "Mehdi Taremi": 3.6,
  "Bryan Mbeumo": 3.4,
  "Álvaro Morata": 3.8,
  "Ante Budimir": 4.0,
  "Andrej Kramarić": 3.9,
  "Aleksandar Mitrović": 3.5,
  "Mohammed Kudus": 3.6,
  "Luis Díaz": 3.7,
  "Kaoru Mitoma": 3.8,
  "Takefusa Kubo": 3.9,
  "Mostafa Mohamed": 4.0,
  "Issam Jebali": 4.2,
  "Ayoub El Kaabi": 4.0,
  "Christian Pulisic": 4.0,
  "Jude Bellingham": 4.2,
  "Nicolas Jackson": 4.0,
  "Ademola Lookman": 3.8,
  "Riyad Mahrez": 3.9,
  "Amine Gouiri": 4.2,
  "Alexis Sánchez": 4.0,
  // Tier 3
  "Jamal Musiala": 4.5,
  "Florian Wirtz": 4.8,
  "Lamine Yamal": 4.5,
  "Nico Williams": 4.8,
  "Rafael Leão": 4.5,
  "Gonçalo Ramos": 4.5,
  "Bradley Barcola": 5.0,
  "Bruno Fernandes": 5.0,
  "Paulo Dybala": 5.0,
  "Raphinha": 4.8,
  "Xavi Simons": 5.0,
  "Donyell Malen": 5.2,
  "Cole Palmer": 5.2,
  "Ollie Watkins": 5.0,
  "Fakund Pellistri": 5.5,
  "Mykhaylo Mudryk": 5.0,
  "Kenan Yıldız": 5.0,
  "Arda Güler": 5.2,
  "Dominik Szoboszlai": 4.8,
  "Patrik Schick": 4.5,
  "Adam Hložek": 5.5,
  "Rashimus Højlund": 5.0,
  "Rasmus Højlund": 5.0,
  "Jhon Durán": 4.8,
  "Boulaye Dia": 5.2,
  "Leon Bailey": 5.2,
  "Simon Adingra": 5.5,
  "Iliman Ndiaye": 5.5,
  "Victor Boniface": 4.5,
  "Kerem Aktürkoğlu": 5.2,
  "Tajon Buchanan": 5.5,
  "Kusini Yengi": 5.5,
  "Timothy Weah": 5.5,
}

export function getPlayerBaseOdds(player: string, rosterIndex: number): number {
  // Cherche cote exacte
  if (PLAYER_BASE_ODDS[player] !== undefined) return PLAYER_BASE_ODDS[player]

  // Normalise et cherche sans accents
  const normalized = player.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  for (const [key, val] of Object.entries(PLAYER_BASE_ODDS)) {
    if (key.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized) return val
  }

  // Fallback selon position dans le roster
  // Position 0-1 = attaquants (cotes basses), position 6-7 = milieux (cotes hautes)
  const tiers = [4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.5, 12.0]
  const idx = Math.min(rosterIndex, tiers.length - 1)
  return tiers[idx]
}

export function rosterFor(team: string): string[] {
  if (ROSTERS[team]) return ROSTERS[team]
  const lower = team.toLowerCase().trim()
  for (const [key, players] of Object.entries(ROSTERS)) {
    if (key.toLowerCase() === lower) return players
  }
  return ["Attaquant vedette", "Avant-centre", "Ailier gauche", "Ailier droit", "Milieu offensif", "Second attaquant"]
}

export function matchRoster(homeTeam: string, awayTeam: string): string[] {
  return [...rosterFor(homeTeam), ...rosterFor(awayTeam)]
}
