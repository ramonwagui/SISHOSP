import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SurveyData {
  id: string;
  surveyType: string;
  patientName: string;
  queueNumber: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function PesquisaSatisfacao() {
  const [, params] = useRoute("/pesquisa/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!params?.token) {
      setError("Token inválido");
      setLoading(false);
      return;
    }

    fetchSurveyData(params.token);
  }, [params?.token]);

  const fetchSurveyData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pesquisa/${token}`);
      
      if (!response.ok) {
        const data = await response.json();
        if (data.alreadyCompleted) {
          setError("Esta pesquisa já foi respondida. Obrigado!");
        } else if (data.expired) {
          setError("Esta pesquisa expirou. Entre em contato conosco se necessário.");
        } else {
          setError(data.message || "Pesquisa não encontrada");
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setSurveyData(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching survey:", err);
      setError("Erro ao carregar pesquisa. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!params?.token) {
      toast({
        title: "Erro",
        description: "Token inválido",
        variant: "destructive"
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Avaliação necessária",
        description: "Por favor, selecione uma avaliação de 1 a 5 estrelas",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/pesquisa/${params.token}/responder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rating, feedback })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao enviar resposta");
      }

      setSubmitted(true);
      toast({
        title: "Avaliação enviada!",
        description: "Muito obrigado pelo seu feedback! 💙",
      });
    } catch (err) {
      console.error("Error submitting survey:", err);
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao enviar resposta",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSurveyTypeLabel = (type: string) => {
    switch (type) {
      case "receptionist_satisfaction":
        return "Atendimento da Recepção";
      case "doctor_satisfaction":
        return "Atendimento Médico";
      default:
        return "Atendimento";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando pesquisa...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error || "Pesquisa não encontrada"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl text-green-600">Obrigado! 💙</CardTitle>
            <CardDescription className="text-base mt-2">
              Sua avaliação foi enviada com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Seu feedback é muito importante para melhorarmos nossos serviços.
            </p>
            <p className="text-sm text-gray-500">
              Hospital Municipal Joaquim Pereira de Sousa
              <br />
              Exu Bem Cuidada
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center border-b">
          <div className="mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-2xl sm:text-3xl text-gray-800">
              Pesquisa de Satisfação
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Hospital Municipal Joaquim Pereira de Sousa - Exu Bem Cuidada
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              <strong>Paciente:</strong> {surveyData.patientName}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Senha:</strong> {surveyData.queueNumber}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Tipo:</strong> {getSurveyTypeLabel(surveyData.surveyType)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-center mb-4">
                <span className="text-lg font-semibold text-gray-700">
                  Como você avalia nosso atendimento?
                </span>
              </label>
              
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    data-testid={`star-rating-${star}`}
                  >
                    <Star
                      className={`w-12 h-12 sm:w-14 sm:h-14 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 stroke-yellow-500"
                          : "fill-gray-200 stroke-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="text-center">
                {rating > 0 && (
                  <p className="text-sm font-medium text-gray-600 animate-in fade-in">
                    {rating === 1 && "Muito insatisfeito"}
                    {rating === 2 && "Insatisfeito"}
                    {rating === 3 && "Neutro"}
                    {rating === 4 && "Satisfeito"}
                    {rating === 5 && "Muito satisfeito"}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Comentários ou sugestões (opcional)
              </label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Compartilhe sua experiência conosco..."
                rows={4}
                className="resize-none"
                data-testid="input-feedback"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
              data-testid="button-submit-survey"
            >
              {submitting ? "Enviando..." : "Enviar Avaliação"}
            </Button>

            {surveyData.expiresAt && (
              <p className="text-xs text-center text-gray-500">
                Esta pesquisa expira em{" "}
                {new Date(surveyData.expiresAt).toLocaleString("pt-BR")}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
