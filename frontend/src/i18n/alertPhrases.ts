/**
 * Frontend maps for fixed backend-origin alert strings (alerts.py).
 * Keys are the English source text. Unmapped strings stay English.
 */
import type { Locale } from './languages'

const ES: Record<string, string> = {
  // Titles
  'Heart rate above your baseline': 'Frecuencia cardíaca por encima de tu base',
  'Heart rate below your baseline': 'Frecuencia cardíaca por debajo de tu base',
  'Heart rate variability is low': 'La variabilidad cardíaca está baja',
  'Oxygen saturation below your baseline': 'Saturación de oxígeno por debajo de tu base',
  'Body temperature above your baseline': 'Temperatura corporal por encima de tu base',
  'Body temperature below your baseline': 'Temperatura corporal por debajo de tu base',
  'Breathing faster than usual': 'Respiración más rápida de lo habitual',
  'Breathing slower than usual': 'Respiración más lenta de lo habitual',
  'Blood pressure above your baseline': 'Presión arterial por encima de tu base',
  'Blood pressure below your baseline': 'Presión arterial por debajo de tu base',
  'ECG signal lost': 'Señal de ECG perdida',
  'Radiation hit on the pulse sensor': 'Impacto de radiación en el sensor de pulso',
  'Radiation dose rate is elevated': 'La tasa de dosis de radiación está elevada',
  'Radiation dose rate is high': 'La tasa de dosis de radiación es alta',
  // Explanations
  'Your heart is beating faster than usual. Exertion, stress, heat or low oxygen can all do this.':
    'Tu corazón late más rápido de lo habitual. El esfuerzo, el estrés, el calor o el bajo oxígeno pueden causarlo.',
  'Your heart is beating slower than usual. This can be normal at rest but should be checked if you feel unwell.':
    'Tu corazón late más lento de lo habitual. Puede ser normal en reposo, pero conviene revisarlo si te sientes mal.',
  'Low variability means your body is under strain, often from stress, poor sleep or fatigue.':
    'Una variabilidad baja significa que tu cuerpo está bajo tensión, a menudo por estrés, poco sueño o fatiga.',
  'The oxygen level in your blood is lower than usual. This can come from poor cabin air or a breathing problem.':
    'El nivel de oxígeno en tu sangre es más bajo de lo habitual. Puede deberse al aire de cabina o a un problema respiratorio.',
  'Your temperature is higher than usual. Heat, exercise, fatigue or an infection can cause this.':
    'Tu temperatura es más alta de lo habitual. El calor, el ejercicio, la fatiga o una infección pueden causarlo.',
  'Your temperature is lower than usual, which can happen when you are cold or exhausted.':
    'Tu temperatura es más baja de lo habitual; puede ocurrir si tienes frío o estás agotado.',
  'You are breathing more quickly than your baseline. Exertion, stress or low oxygen can cause this.':
    'Respiras más rápido que tu base. El esfuerzo, el estrés o el bajo oxígeno pueden causarlo.',
  'You are breathing more slowly than your baseline.': 'Respiras más despacio que tu base.',
  'Your estimated blood pressure is higher than usual. Stress, fluid shifts or exertion can cause this.':
    'Tu presión arterial estimada es más alta de lo habitual. El estrés, los cambios de fluidos o el esfuerzo pueden causarlo.',
  'Your estimated blood pressure is lower than usual. Fluid shifts in microgravity can cause this.':
    'Tu presión arterial estimada es más baja de lo habitual. Los cambios de fluidos en microgravedad pueden causarlo.',
  'The ECG signal is noisy or flat, so heart rate and variability readings are ignored. This looks like a sensor problem, not a heart problem.':
    'La señal de ECG está ruidosa o plana, así que se ignoran FC y variabilidad. Parece un problema de sensor, no del corazón.',
  'Sharp spikes on the pulse sensor match radiation striking it. Oxygen and blood pressure readings are ignored until the signal is clean.':
    'Picos en el sensor de pulso coinciden con impactos de radiación. Se ignoran oxígeno y presión hasta que la señal esté limpia.',
  'The radiation level is above normal. This may be the start of a solar particle event.':
    'El nivel de radiación está por encima de lo normal. Puede ser el inicio de un evento de partículas solares.',
  'The radiation level is dangerously high, as in a strong solar particle event.':
    'El nivel de radiación es peligrosamente alto, como en un evento fuerte de partículas solares.',
  // Guidance steps
  'Stop what you are doing and sit or float calmly for a few minutes.':
    'Detén lo que estás haciendo y siéntate o flota con calma unos minutos.',
  'Take slow, deep breaths and drink some water.': 'Respira despacio y profundo y bebe un poco de agua.',
  'Check the cabin temperature and air quality.': 'Revisa la temperatura y la calidad del aire de la cabina.',
  'If it stays high at rest, report it to the flight surgeon.':
    'Si se mantiene alta en reposo, avisa al médico de vuelo.',
  'Note whether you feel dizzy, faint or unusually tired.':
    'Anota si te sientes mareado, débil o inusualmente cansado.',
  'Move slowly and avoid sudden changes of position.':
    'Muévete despacio y evita cambios bruscos de posición.',
  'Report it to the flight surgeon if you feel unwell.':
    'Avísalo al médico de vuelo si te sientes mal.',
  'Plan a rest period and aim for a full sleep cycle.':
    'Planifica un descanso y apunta a un ciclo completo de sueño.',
  'Postpone demanding tasks if you can.': 'Aplaza tareas exigentes si puedes.',
  'Log how you feel in the daily check-in.': 'Anota cómo te sientes en el check-in diario.',
  'If it stays low for a day or more, tell the flight surgeon.':
    'Si se mantiene baja un día o más, avisa al médico de vuelo.',
  'Check the cabin oxygen and carbon dioxide levels.':
    'Revisa los niveles de oxígeno y dióxido de carbono de la cabina.',
  'Sit upright and take slow, deep breaths.': 'Siéntate erguido y respira despacio y profundo.',
  'Stop strenuous activity until it recovers.': 'Detén la actividad intensa hasta que se recupere.',
  'Report it to the flight surgeon if it does not improve.':
    'Avísalo al médico de vuelo si no mejora.',
  'Rest and cool down, and check the cabin temperature.':
    'Descansa, refréscate y revisa la temperatura de la cabina.',
  'Drink water.': 'Bebe agua.',
  'Re-measure in 15 minutes.': 'Vuelve a medir en 15 minutos.',
  'Report it to the flight surgeon if it keeps rising.':
    'Avísalo al médico de vuelo si sigue subiendo.',
  'Put on warmer clothing and check the cabin temperature.':
    'Ponte ropa más abrigada y revisa la temperatura de la cabina.',
  'Have a warm drink or meal.': 'Toma una bebida o comida caliente.',
  'Pause and breathe slowly: in for 4 seconds, out for 6.':
    'Pausa y respira despacio: inspira 4 segundos, espira 6.',
  'Check the cabin air quality.': 'Revisa la calidad del aire de la cabina.',
  'Report it to the flight surgeon if it continues at rest.':
    'Avísalo al médico de vuelo si continúa en reposo.',
  'Take a few deliberate deep breaths.': 'Haz algunas respiraciones profundas deliberadas.',
  'Note whether you feel drowsy or lightheaded.': 'Anota si te sientes somnoliento o aturdido.',
  'Report it to the flight surgeon if it continues.':
    'Avísalo al médico de vuelo si continúa.',
  'Rest quietly and breathe slowly for a few minutes.':
    'Descansa en silencio y respira despacio unos minutos.',
  'Drink water and avoid caffeine.': 'Bebe agua y evita la cafeína.',
  'Report it to the flight surgeon if it stays high.':
    'Avísalo al médico de vuelo si se mantiene alta.',
  'Report it to the flight surgeon if you feel dizzy or faint.':
    'Avísalo al médico de vuelo si te sientes mareado o débil.',
  'Check that the ECG electrodes are firmly attached to your skin.':
    'Comprueba que los electrodos de ECG estén bien adheridos a la piel.',
  'Press each electrode and check the cable connection.':
    'Presiona cada electrodo y revisa la conexión del cable.',
  'Wait about 30 seconds for the signal to return.':
    'Espera unos 30 segundos a que vuelva la señal.',
  'If it does not, replace the electrodes.': 'Si no vuelve, sustituye los electrodos.',
  'No action is needed for your body based on these readings.':
    'No hace falta actuar sobre tu cuerpo por estas lecturas.',
  'Check the radiation dose rate on this screen.':
    'Revisa la tasa de dosis de radiación en esta pantalla.',
  'If radiation is high, move to the shielded area.':
    'Si la radiación es alta, muévete a la zona protegida.',
  'Check the space weather forecast on this screen.':
    'Revisa el pronóstico de clima espacial en esta pantalla.',
  'Limit time in lightly shielded areas.': 'Limita el tiempo en zonas poco protegidas.',
  'Be ready to move to the shielded area.': 'Prepárate para ir a la zona protegida.',
  'Move to the shielded area now.': 'Muévete ya a la zona protegida.',
  'Stay there until the dose rate drops.': 'Quédate allí hasta que baje la tasa de dosis.',
  'Contact ground control and report your exposure.':
    'Contacta con control de tierra e informa de tu exposición.',
  'Contact the flight surgeon on the ground now.':
    'Contacta ahora con el médico de vuelo en tierra.',
  // Local analysis conditions (fixed titles)
  'Possible low blood oxygen (hypoxia)': 'Posible bajo oxígeno en sangre (hipoxia)',
  'Possible early response to radiation exposure': 'Posible respuesta temprana a la exposición a radiación',
  'Possible fatigue or poor recovery': 'Posible fatiga o mala recuperación',
  'Possible fever or infection': 'Posible fiebre o infección',
  'Possible low blood pressure or fluid shift': 'Posible presión arterial baja o cambio de fluidos',
  'Possible stress or low mood': 'Posible estrés o bajo ánimo',
  'Possible sensor problem: ECG electrodes': 'Posible problema de sensor: electrodos de ECG',
  'Possible sensor problem: pulse sensor': 'Posible problema de sensor: sensor de pulso',
  'Decision support, not a medical diagnosis.': 'Apoyo a la decisión, no un diagnóstico médico.',
  // Local analysis fixed actions
  'Check the cabin oxygen and carbon dioxide levels, sit upright and breathe slowly; tell the flight surgeon if it does not improve.':
    'Revisa los niveles de oxígeno y dióxido de carbono de la cabina, siéntate erguido y respira despacio; avisa al médico de vuelo si no mejora.',
  'Move to the shielded area, contact ground control and log how you feel.':
    'Muévete a la zona protegida, contacta con control de tierra y anota cómo te sientes.',
  'Plan a rest period with a full sleep cycle and postpone demanding tasks if you can.':
    'Planifica un descanso con un ciclo completo de sueño y aplaza tareas exigentes si puedes.',
  'Rest, drink water and re-measure in 15 minutes; report it to the flight surgeon if it keeps rising.':
    'Descansa, bebe agua y vuelve a medir en 15 minutos; avísalo al médico de vuelo si sigue subiendo.',
  'Move slowly, drink water and report it to the flight surgeon if you feel dizzy or faint.':
    'Muévete despacio, bebe agua y avísalo al médico de vuelo si te sientes mareado o débil.',
  'Talk to a crew mate or the ground team, and keep logging your daily check-in.':
    'Habla con un compañero o con el equipo en tierra, y sigue anotando tu check-in diario.',
}

const FR: Record<string, string> = {
  'Heart rate above your baseline': 'Fréquence cardiaque au-dessus de votre base',
  'Heart rate below your baseline': 'Fréquence cardiaque en dessous de votre base',
  'Heart rate variability is low': 'La variabilité cardiaque est basse',
  'Oxygen saturation below your baseline': 'Saturation en oxygène en dessous de votre base',
  'Body temperature above your baseline': 'Température corporelle au-dessus de votre base',
  'Body temperature below your baseline': 'Température corporelle en dessous de votre base',
  'Breathing faster than usual': 'Respiration plus rapide que d’habitude',
  'Breathing slower than usual': 'Respiration plus lente que d’habitude',
  'Blood pressure above your baseline': 'Pression artérielle au-dessus de votre base',
  'Blood pressure below your baseline': 'Pression artérielle en dessous de votre base',
  'ECG signal lost': 'Signal ECG perdu',
  'Radiation hit on the pulse sensor': 'Impact de rayonnement sur le capteur de pouls',
  'Radiation dose rate is elevated': 'Le débit de dose de rayonnement est élevé',
  'Radiation dose rate is high': 'Le débit de dose de rayonnement est élevé (critique)',
  'Your heart is beating faster than usual. Exertion, stress, heat or low oxygen can all do this.':
    'Votre cœur bat plus vite que d’habitude. L’effort, le stress, la chaleur ou un manque d’oxygène peuvent le causer.',
  'Your heart is beating slower than usual. This can be normal at rest but should be checked if you feel unwell.':
    'Votre cœur bat plus lentement que d’habitude. Cela peut être normal au repos, mais à vérifier si vous vous sentez mal.',
  'Low variability means your body is under strain, often from stress, poor sleep or fatigue.':
    'Une faible variabilité signifie que votre corps est sous tension, souvent à cause du stress, d’un mauvais sommeil ou de la fatigue.',
  'The oxygen level in your blood is lower than usual. This can come from poor cabin air or a breathing problem.':
    'Le niveau d’oxygène dans votre sang est plus bas que d’habitude. Cela peut venir de l’air de cabine ou d’un problème respiratoire.',
  'Your temperature is higher than usual. Heat, exercise, fatigue or an infection can cause this.':
    'Votre température est plus élevée que d’habitude. La chaleur, l’exercice, la fatigue ou une infection peuvent le causer.',
  'Your temperature is lower than usual, which can happen when you are cold or exhausted.':
    'Votre température est plus basse que d’habitude ; cela peut arriver si vous avez froid ou êtes épuisé.',
  'You are breathing more quickly than your baseline. Exertion, stress or low oxygen can cause this.':
    'Vous respirez plus vite que votre base. L’effort, le stress ou un manque d’oxygène peuvent le causer.',
  'You are breathing more slowly than your baseline.': 'Vous respirez plus lentement que votre base.',
  'Your estimated blood pressure is higher than usual. Stress, fluid shifts or exertion can cause this.':
    'Votre pression artérielle estimée est plus haute que d’habitude. Le stress, les déplacements de fluides ou l’effort peuvent le causer.',
  'Your estimated blood pressure is lower than usual. Fluid shifts in microgravity can cause this.':
    'Votre pression artérielle estimée est plus basse que d’habitude. Les déplacements de fluides en micropesanteur peuvent le causer.',
  'The ECG signal is noisy or flat, so heart rate and variability readings are ignored. This looks like a sensor problem, not a heart problem.':
    'Le signal ECG est bruyant ou plat ; les lectures de FC et de variabilité sont ignorées. Cela ressemble à un problème de capteur, pas cardiaque.',
  'Sharp spikes on the pulse sensor match radiation striking it. Oxygen and blood pressure readings are ignored until the signal is clean.':
    'Des pics sur le capteur de pouls correspondent à des impacts de rayonnement. Oxygène et pression sont ignorés jusqu’à un signal propre.',
  'The radiation level is above normal. This may be the start of a solar particle event.':
    'Le niveau de rayonnement est au-dessus de la normale. Cela peut être le début d’un événement de particules solaires.',
  'The radiation level is dangerously high, as in a strong solar particle event.':
    'Le niveau de rayonnement est dangereusement élevé, comme lors d’un fort événement de particules solaires.',
  'Stop what you are doing and sit or float calmly for a few minutes.':
    'Arrêtez ce que vous faites et asseyez-vous ou flottez calmement quelques minutes.',
  'Take slow, deep breaths and drink some water.':
    'Respirez lentement et profondément et buvez un peu d’eau.',
  'Check the cabin temperature and air quality.':
    'Vérifiez la température et la qualité de l’air de la cabine.',
  'If it stays high at rest, report it to the flight surgeon.':
    'S’il reste élevé au repos, signalez-le au médecin de vol.',
  'Note whether you feel dizzy, faint or unusually tired.':
    'Notez si vous vous sentez étourdi, faible ou inhabituellement fatigué.',
  'Move slowly and avoid sudden changes of position.':
    'Bougez lentement et évitez les changements brusques de position.',
  'Report it to the flight surgeon if you feel unwell.':
    'Signalez-le au médecin de vol si vous vous sentez mal.',
  'Plan a rest period and aim for a full sleep cycle.':
    'Planifiez un repos et visez un cycle de sommeil complet.',
  'Postpone demanding tasks if you can.': 'Reportez les tâches exigeantes si possible.',
  'Log how you feel in the daily check-in.': 'Notez comment vous vous sentez dans le check-in quotidien.',
  'If it stays low for a day or more, tell the flight surgeon.':
    'S’il reste bas un jour ou plus, dites-le au médecin de vol.',
  'Check the cabin oxygen and carbon dioxide levels.':
    'Vérifiez les niveaux d’oxygène et de dioxyde de carbone de la cabine.',
  'Sit upright and take slow, deep breaths.':
    'Asseyez-vous droit et respirez lentement et profondément.',
  'Stop strenuous activity until it recovers.':
    'Arrêtez l’activité intense jusqu’à récupération.',
  'Report it to the flight surgeon if it does not improve.':
    'Signalez-le au médecin de vol s’il ne s’améliore pas.',
  'Rest and cool down, and check the cabin temperature.':
    'Reposez-vous, rafraîchissez-vous et vérifiez la température de la cabine.',
  'Drink water.': 'Buvez de l’eau.',
  'Re-measure in 15 minutes.': 'Remesurez dans 15 minutes.',
  'Report it to the flight surgeon if it keeps rising.':
    'Signalez-le au médecin de vol s’il continue à monter.',
  'Put on warmer clothing and check the cabin temperature.':
    'Mettez des vêtements plus chauds et vérifiez la température de la cabine.',
  'Have a warm drink or meal.': 'Prenez une boisson ou un repas chaud.',
  'Pause and breathe slowly: in for 4 seconds, out for 6.':
    'Pausez et respirez lentement : inspirez 4 secondes, expirez 6.',
  'Check the cabin air quality.': 'Vérifiez la qualité de l’air de la cabine.',
  'Report it to the flight surgeon if it continues at rest.':
    'Signalez-le au médecin de vol s’il continue au repos.',
  'Take a few deliberate deep breaths.': 'Faites quelques respirations profondes délibérées.',
  'Note whether you feel drowsy or lightheaded.':
    'Notez si vous vous sentez somnolent ou étourdi.',
  'Report it to the flight surgeon if it continues.':
    'Signalez-le au médecin de vol s’il continue.',
  'Rest quietly and breathe slowly for a few minutes.':
    'Reposez-vous calmement et respirez lentement quelques minutes.',
  'Drink water and avoid caffeine.': 'Buvez de l’eau et évitez la caféine.',
  'Report it to the flight surgeon if it stays high.':
    'Signalez-le au médecin de vol s’il reste élevé.',
  'Report it to the flight surgeon if you feel dizzy or faint.':
    'Signalez-le au médecin de vol si vous vous sentez étourdi ou faible.',
  'Check that the ECG electrodes are firmly attached to your skin.':
    'Vérifiez que les électrodes ECG sont bien fixées sur la peau.',
  'Press each electrode and check the cable connection.':
    'Appuyez sur chaque électrode et vérifiez la connexion du câble.',
  'Wait about 30 seconds for the signal to return.':
    'Attendez environ 30 secondes que le signal revienne.',
  'If it does not, replace the electrodes.': 'S’il ne revient pas, remplacez les électrodes.',
  'No action is needed for your body based on these readings.':
    'Aucune action n’est nécessaire pour votre corps d’après ces lectures.',
  'Check the radiation dose rate on this screen.':
    'Vérifiez le débit de dose de rayonnement sur cet écran.',
  'If radiation is high, move to the shielded area.':
    'Si le rayonnement est élevé, allez dans la zone blindée.',
  'Check the space weather forecast on this screen.':
    'Consultez la prévision de météo spatiale sur cet écran.',
  'Limit time in lightly shielded areas.': 'Limitez le temps dans les zones peu blindées.',
  'Be ready to move to the shielded area.': 'Soyez prêt à aller dans la zone blindée.',
  'Move to the shielded area now.': 'Allez maintenant dans la zone blindée.',
  'Stay there until the dose rate drops.': 'Restez-y jusqu’à ce que le débit de dose baisse.',
  'Contact ground control and report your exposure.':
    'Contactez le contrôle au sol et signalez votre exposition.',
  'Contact the flight surgeon on the ground now.':
    'Contactez maintenant le médecin de vol au sol.',
  'Possible low blood oxygen (hypoxia)': 'Possible faible oxygène sanguin (hypoxie)',
  'Possible early response to radiation exposure':
    'Possible réponse précoce à une exposition au rayonnement',
  'Possible fatigue or poor recovery': 'Possible fatigue ou mauvaise récupération',
  'Possible fever or infection': 'Possible fièvre ou infection',
  'Possible low blood pressure or fluid shift':
    'Possible basse pression artérielle ou déplacement de fluides',
  'Possible stress or low mood': 'Possible stress ou moral bas',
  'Possible sensor problem: ECG electrodes': 'Possible problème de capteur : électrodes ECG',
  'Possible sensor problem: pulse sensor': 'Possible problème de capteur : capteur de pouls',
  'Decision support, not a medical diagnosis.':
    'Aide à la décision, pas un diagnostic médical.',
  'Check the cabin oxygen and carbon dioxide levels, sit upright and breathe slowly; tell the flight surgeon if it does not improve.':
    'Vérifiez les niveaux d’oxygène et de dioxyde de carbone de la cabine, asseyez-vous droit et respirez lentement ; dites-le au médecin de vol si cela ne s’améliore pas.',
  'Move to the shielded area, contact ground control and log how you feel.':
    'Allez dans la zone blindée, contactez le contrôle au sol et notez comment vous vous sentez.',
  'Plan a rest period with a full sleep cycle and postpone demanding tasks if you can.':
    'Planifiez un repos avec un cycle de sommeil complet et reportez les tâches exigeantes si possible.',
  'Rest, drink water and re-measure in 15 minutes; report it to the flight surgeon if it keeps rising.':
    'Reposez-vous, buvez de l’eau et remesurez dans 15 minutes ; signalez-le au médecin de vol s’il continue à monter.',
  'Move slowly, drink water and report it to the flight surgeon if you feel dizzy or faint.':
    'Bougez lentement, buvez de l’eau et signalez-le au médecin de vol si vous vous sentez étourdi ou faible.',
  'Talk to a crew mate or the ground team, and keep logging your daily check-in.':
    'Parlez à un coéquipier ou à l’équipe au sol, et continuez à noter votre check-in quotidien.',
}

const MAPS: Partial<Record<Locale, Record<string, string>>> = {
  es: ES,
  fr: FR,
}

/** Translate a fixed English backend phrase, or return it unchanged. */
export function translateBackendPhrase(text: string, locale: Locale): string {
  if (locale === 'en' || !text) return text
  const map = MAPS[locale]
  return map?.[text] ?? text
}

/** Phrases that remain English for a locale (for leftover reporting). */
export function untranslatedBackendPhrase(text: string, locale: Locale): boolean {
  if (locale === 'en' || !text) return false
  const map = MAPS[locale]
  return !map?.[text]
}
