// World Cup 2026 player rosters for scorer markets.
// Each team gets 5-6 key attacking players (forwards + attacking mids).

export const ROSTERS: Record<string, string[]> = {
  France: ["Kylian Mbappé", "Antoine Griezmann", "Ousmane Dembélé", "Marcus Thuram", "Randal Kolo Muani", "Kingsley Coman"],
  Argentina: ["Lionel Messi", "Julián Álvarez", "Lautaro Martínez", "Ángel Di María", "Nicolás González", "Paulo Dybala"],
  Brazil: ["Vinícius Júnior", "Rodrygo", "Raphinha", "Endrick", "Gabriel Martinelli", "Savinho"],
  England: ["Harry Kane", "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Cole Palmer", "Ollie Watkins"],
  Spain: ["Lamine Yamal", "Nico Williams", "Álvaro Morata", "Dani Olmo", "Mikel Oyarzabal", "Ferran Torres"],
  Portugal: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leão", "Gonçalo Ramos", "Bernardo Silva", "Diogo Jota"],
  Germany: ["Kai Havertz", "Jamal Musiala", "Florian Wirtz", "Niclas Füllkrug", "Leroy Sané", "Thomas Müller"],
  Netherlands: ["Memphis Depay", "Cody Gakpo", "Donyell Malen", "Xavi Simons", "Wout Weghorst", "Steven Bergwijn"],
  Italy: ["Mateo Retegui", "Federico Chiesa", "Giacomo Raspadori", "Lorenzo Pellegrini", "Moise Kean", "Nicolò Zaniolo"],
  Belgium: ["Romelu Lukaku", "Kevin De Bruyne", "Jérémy Doku", "Leandro Trossard", "Loïs Openda", "Charles De Ketelaere"],
  Croatia: ["Andrej Kramarić", "Luka Modrić", "Ivan Perišić", "Bruno Petković", "Lovro Majer", "Ante Budimir"],
  Uruguay: ["Darwin Núñez", "Federico Valverde", "Luis Suárez", "Facundo Pellistri", "Maximiliano Araújo", "Brian Rodríguez"],
  Mexico: ["Santiago Giménez", "Hirving Lozano", "Julián Quiñones", "Alexis Vega", "Raúl Jiménez", "Orbelín Pineda"],
  Morocco: ["Youssef En-Nesyri", "Hakim Ziyech", "Achraf Hakimi", "Sofiane Boufal", "Brahim Díaz", "Ayoub El Kaabi"],
  Senegal: ["Sadio Mané", "Ismaïla Sarr", "Nicolas Jackson", "Boulaye Dia", "Habib Diallo", "Iliman Ndiaye"],
  Japan: ["Takefusa Kubo", "Kaoru Mitoma", "Daizen Maeda", "Takumi Minamino", "Ayase Ueda", "Ritsu Dōan"],
  "United States": ["Christian Pulisic", "Folarin Balogun", "Timothy Weah", "Giovanni Reyna", "Haji Wright", "Ricardo Pepi"],
  USA: ["Christian Pulisic", "Folarin Balogun", "Timothy Weah", "Giovanni Reyna", "Haji Wright", "Ricardo Pepi"],
  "South Korea": ["Son Heung-min", "Hwang Hee-chan", "Lee Kang-in", "Cho Gue-sung", "Oh Hyeon-gyu", "Jeong Woo-yeong"],
  "Korea Republic": ["Son Heung-min", "Hwang Hee-chan", "Lee Kang-in", "Cho Gue-sung", "Oh Hyeon-gyu", "Jeong Woo-yeong"],
  Canada: ["Jonathan David", "Cyle Larin", "Alphonso Davies", "Tajon Buchanan", "Iké Ugbo", "Jonathan Osorio"],
  Ecuador: ["Enner Valencia", "Gonzalo Plata", "Kendry Páez", "Jhoanner Chávez", "Ángel Mena", "Kevin Rodríguez"],
  Denmark: ["Rasmus Højlund", "Mikkel Damsgaard", "Jonas Wind", "Andreas Skov Olsen", "Yussuf Poulsen", "Kasper Dolberg"],
  Switzerland: ["Breel Embolo", "Xherdan Shaqiri", "Zeki Amdouni", "Ruben Vargas", "Noah Okafor", "Dan Ndoye"],
  Serbia: ["Dušan Vlahović", "Aleksandar Mitrović", "Luka Jović", "Dušan Tadić", "Filip Kostić", "Andrija Živković"],
  Poland: ["Robert Lewandowski", "Karol Świderski", "Piotr Zieliński", "Jakub Moder", "Arkadiusz Milik", "Sebastian Szymański"],
  Austria: ["Marko Arnautović", "Marcel Sabitzer", "Christoph Baumgartner", "Michael Gregoritsch", "Konrad Laimer", "Saša Kalajdžić"],
  Hungary: ["Dominik Szoboszlai", "Roland Sallai", "Barnabás Varga", "Dániel Gazdag", "Kevin Csoboth", "Martin Ádám"],
  Czechia: ["Patrik Schick", "Adam Hložek", "Tomáš Souček", "Václav Černý", "Mojmír Chytil", "Jan Kuchta"],
  Greece: ["Vangelis Pavlidis", "Giorgos Masouras", "Anastasios Douvikas", "Giorgos Giakoumakis", "Christos Tzolis", "Fotis Ioannidis"],
  Norway: ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth", "Antonio Nusa", "Jørgen Strand Larsen", "Oscar Bobb"],
  Sweden: ["Alexander Isak", "Viktor Gyökeres", "Dejan Kulusevski", "Anthony Elanga", "Emil Forsberg", "Viktor Claesson"],
  Turkey: ["Hakan Çalhanoğlu", "Kerem Aktürkoğlu", "Barış Alper Yılmaz", "Cenk Tosun", "Kenan Yıldız", "Arda Güler"],
  Ukraine: ["Artem Dovbyk", "Mykhaylo Mudryk", "Viktor Tsyhankov", "Andriy Yarmolenko", "Roman Yaremchuk", "Oleksandr Zinchenko"],
  Romania: ["Denis Drăguş", "George Puşcaş", "Nicolae Stanciu", "Valentin Mihăilă", "Florinel Coman", "Denis Alibec"],
  Wales: ["Brennan Johnson", "Kieffer Moore", "Harry Wilson", "Daniel James", "David Brooks", "Nathan Broadhead"],
  Scotland: ["Scott McTominay", "John McGinn", "Ché Adams", "Lawrence Shankland", "Ryan Christie", "Lewis Ferguson"],
  Cameroon: ["Vincent Aboubakar", "Bryan Mbeumo", "Karl Toko Ekambi", "Eric Maxim Choupo-Moting", "Georges-Kévin Nkoudou", "Faris Moumbagna"],
  Ghana: ["Mohammed Kudus", "Iñaki Williams", "Jordan Ayew", "Antoine Semenyo", "Ernest Nuamah", "André Ayew"],
  Nigeria: ["Victor Osimhen", "Ademola Lookman", "Victor Boniface", "Samuel Chukwueze", "Kelechi Iheanacho", "Terem Moffi"],
  Algeria: ["Riyad Mahrez", "Islam Slimani", "Amine Gouiri", "Saïd Benrahma", "Baghdad Bounedjah", "Youcef Belaïli"],
  "Ivory Coast": ["Sébastien Haller", "Nicolas Pépé", "Simon Adingra", "Jonathan Bamba", "Oumar Diakité", "Jean-Philippe Krasso"],
  Egypt: ["Mohamed Salah", "Omar Marmoush", "Mostafa Mohamed", "Trézéguet", "Mahmoud Trezeguet", "Ahmed Hassan Kouka"],
  Tunisia: ["Youssef Msakni", "Wahbi Khazri", "Issam Jebali", "Naïm Sliti", "Anis Ben Slimane", "Haythem Jouini"],
  "South Africa": ["Percy Tau", "Lyle Foster", "Themba Zwane", "Bongokuhle Hlongwane", "Evidence Makgopa", "Zakhele Lepasa"],
  "Saudi Arabia": ["Salem Al-Dawsari", "Firas Al-Buraikan", "Saleh Al-Shehri", "Abdullah Al-Hamdan", "Abdulrahman Ghareeb", "Sami Al-Najei"],
  Qatar: ["Almoez Ali", "Akram Afif", "Hassan Al-Haydos", "Mohammed Muntari", "Yusuf Abdurisag", "Ahmed Alaaeldin"],
  Iran: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh", "Karim Ansarifard", "Mehdi Ghayedi", "Shahriyar Moghanlou"],
  Iraq: ["Aymen Hussein", "Ali Jasim", "Mohanad Ali", "Bashar Resan", "Amir Al-Ammari", "Zidane Iqbal"],
  Australia: ["Mitchell Duke", "Craig Goodwin", "Kusini Yengi", "Mathew Leckie", "Brandon Borrello", "Nestory Irankunda"],
  "New Zealand": ["Chris Wood", "Ben Waine", "Elijah Just", "Marko Stamenić", "Kosta Barbarouses", "Max Mata"],
  Chile: ["Alexis Sánchez", "Ben Brereton Díaz", "Víctor Dávila", "Eduardo Vargas", "Darío Osorio", "Diego Valdés"],
  Colombia: ["Luis Díaz", "Rafael Santos Borré", "Jhon Durán", "James Rodríguez", "Jhon Arias", "Luis Sinisterra"],
  Paraguay: ["Miguel Almirón", "Julio Enciso", "Ángel Romero", "Ramón Sosa", "Antonio Sanabria", "Alex Arce"],
  Peru: ["Gianluca Lapadula", "André Carrillo", "Bryan Reyna", "Edison Flores", "Franco Zanelatto", "Paolo Guerrero"],
  Venezuela: ["Salomón Rondón", "Josef Martínez", "Yeferson Soteldo", "Darwin Machís", "Jhonder Cádiz", "Eric Ramírez"],
  Jamaica: ["Michail Antonio", "Leon Bailey", "Shamar Nicholson", "Demarai Gray", "Bobby De Cordova-Reid", "Cory Burke"],
  "Costa Rica": ["Joel Campbell", "Manfred Ugalde", "Anthony Contreras", "Álvaro Zamora", "Jewison Bennette", "Ariel Lassiter"],
  Panama: ["José Fajardo", "Ismael Díaz", "Édgar Bárcenas", "Alfredo Stephens", "Cecilio Waterman", "Yoel Bárcenas"],
  Honduras: ["Anthony Lozano", "Alberth Elis", "Luis Palma", "Rubilio Castillo", "Choco Lozano", "Jorge Benguché"],
  Bahrain: ["Abdulla Yusuf", "Kamil Al-Aswad", "Mahdi Al-Humaidan", "Mohamed Al-Romaihi", "Jasim Al-Shaikh", "Ali Madan"],
  UAE: ["Ali Mabkhout", "Caio Canedo", "Fábio Lima", "Yahya Al Ghassani", "Harib Al-Maazmi", "Sebastián Tagliabúe"],
  China: ["Wu Lei", "Zhang Yuning", "Elkeson", "Wei Shihao", "Fernandinho", "Alan"],
}

export function rosterFor(team: string): string[] {
  if (ROSTERS[team]) return ROSTERS[team]
  // fuzzy match
  const lower = team.toLowerCase().trim()
  for (const [key, players] of Object.entries(ROSTERS)) {
    if (key.toLowerCase() === lower) return players
  }
  return ["Attaquant vedette", "Buteur maison", "Ailier rapide", "Milieu offensif", "Avant-centre"]
}

export function matchRoster(homeTeam: string, awayTeam: string): string[] {
  return [...rosterFor(homeTeam), ...rosterFor(awayTeam)]
}
